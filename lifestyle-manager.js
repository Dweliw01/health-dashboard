/**
 * Lifestyle Manager - Smart Health Journal
 * Tracks lifestyle factors that impact sleep/recovery and detects personal patterns
 * Data is stored locally AND synced to cloud for cross-device access
 */

const LifestyleManager = {
    STORAGE_KEY: 'health_dashboard_lifestyle',
    VERSION: 1,

    // Cloud sync configuration
    CLOUD_API: '/api/lifestyle',
    syncInProgress: false,
    lastCloudSync: null,

    // Factor value mappings for analysis
    CAFFEINE_VALUES: {
        none: 0,
        morning_only: 1,
        afternoon: 2,
        evening: 3
    },
    ALCOHOL_VALUES: {
        none: 0,
        one_two: 1,
        three_plus: 2
    },
    MEAL_TIME_VALUES: {
        three_plus: 0,  // Good: 3+ hours before bed
        one_two: 1,
        less_one: 2     // Bad: < 1 hour before bed
    },
    SCREEN_TIME_VALUES: {
        none: 0,
        under_30: 1,
        over_30: 2
    },

    /**
     * Get date string in YYYY-MM-DD format (local time)
     */
    getDateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * Load lifestyle data from localStorage
     */
    load() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                // Migration check
                if (!data.version || data.version < this.VERSION) {
                    return this.migrate(data);
                }
                return data;
            }
        } catch (err) {
            console.warn('Failed to load lifestyle data:', err);
        }
        return this.getDefaultData();
    },

    /**
     * Get default data structure
     */
    getDefaultData() {
        return {
            version: this.VERSION,
            eveningCheckins: [],
            morningReflections: [],
            retroCauses: [],
            patterns: {
                lastAnalyzed: null,
                discovered: []
            },
            streaks: {
                evening: { current: 0, longest: 0 },
                morning: { current: 0, longest: 0 }
            }
        };
    },

    /**
     * Save lifestyle data (local + cloud)
     */
    save(data) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            // Trigger async cloud sync (non-blocking)
            this.syncToCloud(data);
            return true;
        } catch (err) {
            console.error('Failed to save lifestyle data:', err);
            return false;
        }
    },

    /**
     * Initialize and sync with cloud on load
     */
    async initCloudSync() {
        console.log('[Lifestyle] Initializing cloud sync...');
        try {
            const cloudData = await this.loadFromCloud();
            console.log('[Lifestyle] Cloud response:', cloudData);

            if (cloudData && !cloudData.isNew) {
                const localData = this.load();
                console.log('[Lifestyle] Local checkins:', localData.eveningCheckins?.length || 0);
                console.log('[Lifestyle] Cloud checkins:', cloudData.data?.eveningCheckins?.length || 0);

                const mergedData = this.mergeWithCloud(localData, cloudData.data);
                console.log('[Lifestyle] Merged checkins:', mergedData.eveningCheckins?.length || 0);

                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(mergedData));
                console.log('[Lifestyle] Cloud sync complete - data merged and saved');
                return mergedData;
            } else {
                // No cloud data, push local to cloud
                const localData = this.load();
                console.log('[Lifestyle] No cloud data, local checkins:', localData.eveningCheckins?.length || 0);
                if (localData.eveningCheckins.length > 0 || localData.morningReflections.length > 0) {
                    await this.syncToCloud(localData);
                    console.log('[Lifestyle] Local data pushed to cloud');
                }
            }
        } catch (err) {
            console.error('[Lifestyle] Cloud sync failed:', err);
        }
        return this.load();
    },

    /**
     * Load data from cloud storage
     */
    async loadFromCloud() {
        try {
            const response = await fetch(this.CLOUD_API, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            this.lastCloudSync = new Date().toISOString();
            return result;
        } catch (err) {
            console.warn('[Lifestyle] Cloud load failed:', err.message);
            return null;
        }
    },

    /**
     * Sync local data to cloud storage
     */
    async syncToCloud(data) {
        if (this.syncInProgress) {
            console.log('[Lifestyle] Sync already in progress, skipping');
            return;
        }

        this.syncInProgress = true;

        try {
            const response = await fetch(this.CLOUD_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, merge: true })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            this.lastCloudSync = result.savedAt;
            console.log('[Lifestyle] Cloud sync successful:', result.savedAt);
            return result;
        } catch (err) {
            console.warn('[Lifestyle] Cloud sync failed:', err.message);
            // Queue for retry (will sync on next save)
            return null;
        } finally {
            this.syncInProgress = false;
        }
    },

    /**
     * Merge local data with cloud data (cloud wins for conflicts on same date)
     */
    mergeWithCloud(localData, cloudData) {
        if (!cloudData) return localData;

        const merged = { ...localData };

        // Merge evening check-ins by date (prefer most recent timestamp)
        const eveningMap = new Map();
        localData.eveningCheckins?.forEach(c => eveningMap.set(c.date, c));
        cloudData.eveningCheckins?.forEach(c => {
            const existing = eveningMap.get(c.date);
            if (!existing || new Date(c.timestamp) > new Date(existing.timestamp)) {
                eveningMap.set(c.date, c);
            }
        });
        merged.eveningCheckins = Array.from(eveningMap.values())
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        // Merge morning reflections by date
        const morningMap = new Map();
        localData.morningReflections?.forEach(r => morningMap.set(r.date, r));
        cloudData.morningReflections?.forEach(r => {
            const existing = morningMap.get(r.date);
            if (!existing || new Date(r.timestamp) > new Date(existing.timestamp)) {
                morningMap.set(r.date, r);
            }
        });
        merged.morningReflections = Array.from(morningMap.values())
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        // Merge retro causes by date+metric
        const causeMap = new Map();
        localData.retroCauses?.forEach(c => causeMap.set(`${c.date}_${c.metric}`, c));
        cloudData.retroCauses?.forEach(c => {
            const key = `${c.date}_${c.metric}`;
            const existing = causeMap.get(key);
            if (!existing || new Date(c.timestamp) > new Date(existing.timestamp)) {
                causeMap.set(key, c);
            }
        });
        merged.retroCauses = Array.from(causeMap.values())
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        // Keep cloud patterns if more recent
        if (cloudData.patterns?.lastAnalyzed) {
            const cloudAnalyzed = new Date(cloudData.patterns.lastAnalyzed);
            const localAnalyzed = localData.patterns?.lastAnalyzed
                ? new Date(localData.patterns.lastAnalyzed)
                : new Date(0);
            if (cloudAnalyzed > localAnalyzed) {
                merged.patterns = cloudData.patterns;
            }
        }

        // Recalculate streaks from merged data
        this.updateStreaks(merged);

        merged.version = Math.max(localData.version || 1, cloudData.version || 1);
        merged.lastCloudSync = new Date().toISOString();

        return merged;
    },

    /**
     * Migrate from older data versions or CheckinManager
     */
    migrate(oldData) {
        const newData = this.getDefaultData();

        // Preserve existing data if present
        if (oldData.eveningCheckins) newData.eveningCheckins = oldData.eveningCheckins;
        if (oldData.morningReflections) newData.morningReflections = oldData.morningReflections;
        if (oldData.retroCauses) newData.retroCauses = oldData.retroCauses;
        if (oldData.patterns) newData.patterns = oldData.patterns;
        if (oldData.streaks) newData.streaks = oldData.streaks;

        this.save(newData);
        return newData;
    },

    /**
     * Import data from old CheckinManager
     */
    importFromCheckinManager() {
        if (typeof CheckinManager === 'undefined') return;

        const history = CheckinManager.getHistory(90);
        const data = this.load();
        let imported = 0;

        history.forEach(checkin => {
            // Check if we already have this date
            const existingEvening = data.eveningCheckins.find(c => c.date === checkin.date);
            const existingMorning = data.morningReflections.find(c => c.date === checkin.date);

            // Map old tags to new lifestyle factors
            const tags = checkin.tags || [];

            if (!existingEvening) {
                const evening = {
                    date: checkin.date,
                    caffeine: null,
                    alcohol: tags.includes('alcohol') ? 'one_two' : null,
                    lastMealTime: null,
                    screenTime: null,
                    stress: tags.includes('stress') ? 4 : null
                };
                // Only add if we have some data
                if (evening.alcohol || evening.stress) {
                    data.eveningCheckins.push(evening);
                    imported++;
                }
            }

            if (!existingMorning && checkin.energy) {
                const morning = {
                    date: checkin.date,
                    energy: checkin.energy,
                    sleepFelt: tags.includes('poor_sleep') ? 'poor' :
                               tags.includes('good_sleep') ? 'good' : null
                };
                data.morningReflections.push(morning);
                imported++;
            }
        });

        if (imported > 0) {
            this.updateStreaks(data);
            this.save(data);
        }

        return imported;
    },

    /**
     * Save evening check-in
     */
    saveEveningCheckin(checkinData) {
        const data = this.load();
        const today = this.getDateString(new Date());

        // Remove existing check-in for today if exists
        data.eveningCheckins = data.eveningCheckins.filter(c => c.date !== today);

        const checkin = {
            date: today,
            timestamp: new Date().toISOString(),
            caffeine: checkinData.caffeine || null,
            alcohol: checkinData.alcohol || null,
            lastMealTime: checkinData.lastMealTime || null,
            screenTime: checkinData.screenTime || null,
            stress: checkinData.stress || null
        };

        data.eveningCheckins.push(checkin);
        this.updateStreaks(data);
        this.save(data);

        return checkin;
    },

    /**
     * Save morning reflection
     */
    saveMorningReflection(reflectionData) {
        const data = this.load();
        const today = this.getDateString(new Date());

        // Remove existing reflection for today if exists
        data.morningReflections = data.morningReflections.filter(c => c.date !== today);

        const reflection = {
            date: today,
            timestamp: new Date().toISOString(),
            energy: reflectionData.energy || null,
            sleepFelt: reflectionData.sleepFelt || null
        };

        data.morningReflections.push(reflection);
        this.updateStreaks(data);
        this.save(data);

        return reflection;
    },

    /**
     * Save retro cause attribution for an anomaly
     */
    saveRetroCause(metric, causes) {
        const data = this.load();
        const today = this.getDateString(new Date());

        // Remove existing cause for this metric today
        data.retroCauses = data.retroCauses.filter(
            c => !(c.date === today && c.metric === metric)
        );

        const retroCause = {
            date: today,
            timestamp: new Date().toISOString(),
            metric: metric,
            causes: causes
        };

        data.retroCauses.push(retroCause);
        this.save(data);

        return retroCause;
    },

    /**
     * Get today's evening check-in
     */
    getTodayEveningCheckin() {
        const data = this.load();
        const today = this.getDateString(new Date());
        return data.eveningCheckins.find(c => c.date === today) || null;
    },

    /**
     * Get today's morning reflection
     */
    getTodayMorningReflection() {
        const data = this.load();
        const today = this.getDateString(new Date());
        return data.morningReflections.find(c => c.date === today) || null;
    },

    /**
     * Get recent check-ins
     */
    getRecentCheckins(days = 30) {
        const data = this.load();
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        return {
            evening: data.eveningCheckins
                .filter(c => new Date(c.date) >= cutoff)
                .sort((a, b) => new Date(b.date) - new Date(a.date)),
            morning: data.morningReflections
                .filter(c => new Date(c.date) >= cutoff)
                .sort((a, b) => new Date(b.date) - new Date(a.date)),
            retroCauses: data.retroCauses
                .filter(c => new Date(c.date) >= cutoff)
                .sort((a, b) => new Date(b.date) - new Date(a.date))
        };
    },

    /**
     * Update streak calculations
     */
    updateStreaks(data) {
        // Evening streaks
        if (data.eveningCheckins.length > 0) {
            const sorted = [...data.eveningCheckins]
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            data.streaks.evening = this.calculateStreak(sorted);
        }

        // Morning streaks
        if (data.morningReflections.length > 0) {
            const sorted = [...data.morningReflections]
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            data.streaks.morning = this.calculateStreak(sorted);
        }
    },

    /**
     * Calculate streak from sorted array
     */
    calculateStreak(sortedItems) {
        if (sortedItems.length === 0) {
            return { current: 0, longest: 0 };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let currentStreak = 0;

        // Calculate current streak
        for (let i = 0; i < sortedItems.length; i++) {
            const itemDate = new Date(sortedItems[i].date);
            itemDate.setHours(0, 0, 0, 0);

            const expectedDate = new Date(today);
            expectedDate.setDate(expectedDate.getDate() - i);

            const diffDays = Math.round((expectedDate - itemDate) / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                currentStreak++;
            } else if (diffDays === 1 && i === 0) {
                // Allow starting from yesterday
                continue;
            } else {
                break;
            }
        }

        // Calculate longest streak
        let longestStreak = 0;
        let tempStreak = 1;
        const chronological = [...sortedItems]
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        for (let i = 1; i < chronological.length; i++) {
            const prevDate = new Date(chronological[i - 1].date);
            const currDate = new Date(chronological[i].date);
            const diffDays = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                tempStreak++;
            } else {
                longestStreak = Math.max(longestStreak, tempStreak);
                tempStreak = 1;
            }
        }
        longestStreak = Math.max(longestStreak, tempStreak);

        return { current: currentStreak, longest: longestStreak };
    },

    /**
     * Get streaks
     */
    getStreaks() {
        const data = this.load();
        return data.streaks;
    },

    /**
     * Analyze patterns after 14+ days of data
     */
    analyzePatterns(ouraData) {
        const data = this.load();
        const recent = this.getRecentCheckins(30);

        if (recent.evening.length < 14) {
            return {
                hasEnoughData: false,
                daysTracked: recent.evening.length,
                daysNeeded: 14 - recent.evening.length
            };
        }

        const sleepData = ouraData?.sleepStages?.last30Days || [];
        const hrvRecords = ouraData?.hrv?.records || [];

        // Create lookup maps for Oura data by date
        const sleepByDate = {};
        sleepData.forEach(s => {
            if (s.day) sleepByDate[s.day] = s;
        });

        const hrvByDate = {};
        hrvRecords.forEach(r => {
            if (r.day) hrvByDate[r.day] = r.avgHrv;
        });

        const patterns = [];

        // Analyze each factor against each metric
        const factors = [
            { key: 'caffeine', values: this.CAFFEINE_VALUES, badThreshold: 2, name: 'Caffeine after 2pm' },
            { key: 'alcohol', values: this.ALCOHOL_VALUES, badThreshold: 1, name: 'Alcohol consumption' },
            { key: 'lastMealTime', values: this.MEAL_TIME_VALUES, badThreshold: 1, name: 'Late meals' },
            { key: 'screenTime', values: this.SCREEN_TIME_VALUES, badThreshold: 1, name: 'Screen time before bed' },
            { key: 'stress', isContinuous: true, badThreshold: 3, name: 'High stress' }
        ];

        const metrics = [
            { key: 'deep', name: 'deep sleep', unit: 'min', source: 'sleep' },
            { key: 'rem', name: 'REM sleep', unit: 'min', source: 'sleep' },
            { key: 'efficiency', name: 'sleep efficiency', unit: '%', source: 'sleep' },
            { key: 'hrv', name: 'HRV', unit: 'ms', source: 'hrv' }
        ];

        factors.forEach(factor => {
            metrics.forEach(metric => {
                const pattern = this.calculatePatternImpact(
                    recent.evening,
                    factor,
                    metric,
                    sleepByDate,
                    hrvByDate
                );

                if (pattern && pattern.significant) {
                    patterns.push({
                        factor: factor.key,
                        factorName: factor.name,
                        metric: metric.key,
                        metricName: metric.name,
                        impact: pattern.impact,
                        confidence: pattern.confidence,
                        sampleSize: pattern.sampleSize,
                        insight: this.generateInsightText(factor.name, metric.name, pattern.impact, metric.unit)
                    });
                }
            });
        });

        // Sort by absolute impact
        patterns.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

        // Save discovered patterns
        data.patterns = {
            lastAnalyzed: this.getDateString(new Date()),
            discovered: patterns
        };
        this.save(data);

        return {
            hasEnoughData: true,
            daysTracked: recent.evening.length,
            patterns: patterns
        };
    },

    /**
     * Calculate the impact of a factor on a metric
     */
    calculatePatternImpact(checkins, factor, metric, sleepByDate, hrvByDate) {
        const pairs = [];

        checkins.forEach(checkin => {
            const factorValue = checkin[factor.key];
            if (factorValue === null || factorValue === undefined) return;

            // Get next day's metric (lifestyle affects next day's sleep)
            const checkinDate = new Date(checkin.date);
            checkinDate.setDate(checkinDate.getDate() + 1);
            const nextDay = this.getDateString(checkinDate);

            let metricValue = null;
            if (metric.source === 'sleep' && sleepByDate[nextDay]) {
                metricValue = sleepByDate[nextDay][metric.key];
            } else if (metric.source === 'hrv' && hrvByDate[nextDay]) {
                metricValue = hrvByDate[nextDay];
            }

            if (metricValue !== null && metricValue !== undefined) {
                const isBad = factor.isContinuous
                    ? factorValue >= factor.badThreshold
                    : (factor.values[factorValue] || 0) >= factor.badThreshold;

                pairs.push({
                    factorValue: factorValue,
                    metricValue: metricValue,
                    isBad: isBad
                });
            }
        });

        if (pairs.length < 10) return null;

        const badDays = pairs.filter(p => p.isBad);
        const goodDays = pairs.filter(p => !p.isBad);

        if (badDays.length < 3 || goodDays.length < 3) return null;

        const avgBad = badDays.reduce((sum, p) => sum + p.metricValue, 0) / badDays.length;
        const avgGood = goodDays.reduce((sum, p) => sum + p.metricValue, 0) / goodDays.length;

        // Calculate percentage impact
        const impact = Math.round(((avgBad - avgGood) / avgGood) * 100);

        // Calculate confidence based on sample size and consistency
        const confidence = Math.min(0.95, 0.5 + (pairs.length / 50) + (Math.abs(impact) / 100));

        return {
            significant: Math.abs(impact) >= 10 && pairs.length >= 10,
            impact: impact,
            confidence: Math.round(confidence * 100) / 100,
            sampleSize: pairs.length,
            avgBad: Math.round(avgBad),
            avgGood: Math.round(avgGood)
        };
    },

    /**
     * Generate human-readable insight text
     */
    generateInsightText(factorName, metricName, impact, unit) {
        const direction = impact < 0 ? 'reduces' : 'increases';
        const absImpact = Math.abs(impact);
        return `${factorName} ${direction} your ${metricName} by ${absImpact}%`;
    },

    /**
     * Get best sleep night factors
     */
    getBestSleepFactors(ouraData) {
        const data = this.load();
        const sleepData = ouraData?.sleepStages?.last30Days || [];

        if (sleepData.length < 7 || data.eveningCheckins.length < 7) {
            return null;
        }

        // Find top 25% best sleep nights by efficiency
        const sortedSleep = [...sleepData]
            .filter(s => s.efficiency && s.day)
            .sort((a, b) => b.efficiency - a.efficiency);

        const topCount = Math.max(3, Math.floor(sortedSleep.length * 0.25));
        const bestNights = sortedSleep.slice(0, topCount);

        // Get the evening check-ins for the nights before these good sleeps
        const bestFactors = {
            noCaffeineAfterNoon: 0,
            noAlcohol: 0,
            earlyDinner: 0,
            noScreens: 0,
            lowStress: 0,
            total: 0
        };

        bestNights.forEach(night => {
            // Get the evening before this sleep
            const sleepDate = new Date(night.day);
            sleepDate.setDate(sleepDate.getDate() - 1);
            const eveningDate = this.getDateString(sleepDate);

            const checkin = data.eveningCheckins.find(c => c.date === eveningDate);
            if (checkin) {
                bestFactors.total++;
                if (checkin.caffeine === 'none' || checkin.caffeine === 'morning_only') {
                    bestFactors.noCaffeineAfterNoon++;
                }
                if (checkin.alcohol === 'none') {
                    bestFactors.noAlcohol++;
                }
                if (checkin.lastMealTime === 'three_plus') {
                    bestFactors.earlyDinner++;
                }
                if (checkin.screenTime === 'none') {
                    bestFactors.noScreens++;
                }
                if (checkin.stress && checkin.stress <= 2) {
                    bestFactors.lowStress++;
                }
            }
        });

        if (bestFactors.total < 3) return null;

        // Convert to percentages and filter significant ones
        const insights = [];
        const threshold = 70; // At least 70% of best nights had this factor

        if ((bestFactors.noCaffeineAfterNoon / bestFactors.total) * 100 >= threshold) {
            insights.push({
                factor: 'No caffeine after noon',
                percentage: Math.round((bestFactors.noCaffeineAfterNoon / bestFactors.total) * 100)
            });
        }
        if ((bestFactors.noAlcohol / bestFactors.total) * 100 >= threshold) {
            insights.push({
                factor: 'No alcohol',
                percentage: Math.round((bestFactors.noAlcohol / bestFactors.total) * 100)
            });
        }
        if ((bestFactors.earlyDinner / bestFactors.total) * 100 >= threshold) {
            insights.push({
                factor: 'Dinner 3+ hours before bed',
                percentage: Math.round((bestFactors.earlyDinner / bestFactors.total) * 100)
            });
        }
        if ((bestFactors.noScreens / bestFactors.total) * 100 >= threshold) {
            insights.push({
                factor: 'No screens before bed',
                percentage: Math.round((bestFactors.noScreens / bestFactors.total) * 100)
            });
        }
        if ((bestFactors.lowStress / bestFactors.total) * 100 >= threshold) {
            insights.push({
                factor: 'Low stress (1-2)',
                percentage: Math.round((bestFactors.lowStress / bestFactors.total) * 100)
            });
        }

        return insights.sort((a, b) => b.percentage - a.percentage);
    },

    /**
     * Detect anomalies in Oura data for smart prompts
     */
    detectAnomalies(ouraData) {
        const anomalies = [];

        // Deep sleep anomaly
        const lastNight = ouraData?.sleepStages?.lastNight;
        const avgDeep = ouraData?.sleepStages?.avgDeep;
        if (lastNight?.deep && avgDeep && lastNight.deep < 60 && lastNight.deep < avgDeep * 0.7) {
            anomalies.push({
                metric: 'deep_sleep',
                value: lastNight.deep,
                average: avgDeep,
                message: `Your deep sleep was low (${lastNight.deep} min). What might have caused this?`
            });
        }

        // HRV anomaly
        const hrvCurrent = ouraData?.hrv?.current;
        const hrvBaseline = ouraData?.hrv?.baseline;
        if (hrvCurrent && hrvBaseline && hrvCurrent < hrvBaseline * 0.8) {
            anomalies.push({
                metric: 'hrv',
                value: hrvCurrent,
                baseline: hrvBaseline,
                message: `Your HRV is below baseline (${hrvCurrent} vs ${hrvBaseline} ms). What might have caused this?`
            });
        }

        // Sleep efficiency anomaly
        if (lastNight?.efficiency && lastNight.efficiency < 80) {
            anomalies.push({
                metric: 'sleep_efficiency',
                value: lastNight.efficiency,
                message: `Your sleep efficiency was low (${lastNight.efficiency}%). What might have caused this?`
            });
        }

        return anomalies;
    },

    /**
     * Check if user has already responded to an anomaly today
     */
    hasRespondedToAnomaly(metric) {
        const data = this.load();
        const today = this.getDateString(new Date());
        return data.retroCauses.some(c => c.date === today && c.metric === metric);
    },

    /**
     * Get discovered patterns
     */
    getDiscoveredPatterns() {
        const data = this.load();
        return data.patterns;
    },

    /**
     * Get lifestyle context for AI Coach
     */
    getLifestyleContext() {
        const data = this.load();
        const today = this.getDateString(new Date());
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = this.getDateString(yesterday);

        // Get last night's check-in
        const lastEvening = data.eveningCheckins.find(c => c.date === yesterdayStr);

        // Get today's morning reflection
        const todayMorning = data.morningReflections.find(c => c.date === today);

        // Get recent trends (last 7 days)
        const recent = this.getRecentCheckins(7);
        const trends = this.calculateTrends(recent.evening);

        return {
            lastNight: lastEvening,
            thisMorning: todayMorning,
            trends: trends,
            patterns: data.patterns.discovered.slice(0, 3),
            streaks: data.streaks
        };
    },

    /**
     * Calculate trends from recent check-ins
     */
    calculateTrends(eveningCheckins) {
        if (eveningCheckins.length < 3) return null;

        const trends = {
            avgStress: 0,
            caffeineAfternoonCount: 0,
            alcoholCount: 0,
            lateEatingCount: 0,
            total: eveningCheckins.length
        };

        eveningCheckins.forEach(c => {
            if (c.stress) trends.avgStress += c.stress;
            if (c.caffeine === 'afternoon' || c.caffeine === 'evening') trends.caffeineAfternoonCount++;
            if (c.alcohol && c.alcohol !== 'none') trends.alcoholCount++;
            if (c.lastMealTime === 'less_one' || c.lastMealTime === 'one_two') trends.lateEatingCount++;
        });

        trends.avgStress = Math.round((trends.avgStress / eveningCheckins.filter(c => c.stress).length) * 10) / 10;

        return trends;
    },

    /**
     * Export data
     */
    export() {
        return {
            ...this.load(),
            exportedAt: new Date().toISOString()
        };
    },

    /**
     * Import data
     */
    import(importData) {
        try {
            if (importData.eveningCheckins) {
                this.save({
                    version: this.VERSION,
                    eveningCheckins: importData.eveningCheckins,
                    morningReflections: importData.morningReflections || [],
                    retroCauses: importData.retroCauses || [],
                    patterns: importData.patterns || { lastAnalyzed: null, discovered: [] },
                    streaks: importData.streaks || { evening: { current: 0, longest: 0 }, morning: { current: 0, longest: 0 } }
                });
                return true;
            }
        } catch (err) {
            console.error('Failed to import lifestyle data:', err);
        }
        return false;
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LifestyleManager;
}
