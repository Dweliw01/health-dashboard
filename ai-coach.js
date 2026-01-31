/**
 * AI Coach - Smart personalized health insights
 * Analyzes patterns in your Oura data and generates actionable recommendations
 */

const AICoach = {
    // Cache for AI responses (avoid repeated API calls)
    cache: {},
    cacheExpiry: 1000 * 60 * 30, // 30 minutes

    /**
     * Analyze all available data and find patterns
     */
    analyzePatterns(data) {
        const patterns = {
            sleep: this.analyzeSleepPatterns(data),
            activity: this.analyzeActivityPatterns(data),
            recovery: this.analyzeRecoveryPatterns(data),
            stress: this.analyzeStressPatterns(data),
            correlations: this.findCorrelations(data)
        };
        return patterns;
    },

    /**
     * Analyze sleep patterns
     */
    analyzeSleepPatterns(data) {
        const sleepData = data.sleepStages?.last30Days || data.sleepStages?.last7Days || [];
        if (sleepData.length < 3) return null;

        const deepSleepValues = sleepData.map(d => d.deep).filter(v => v > 0);
        const remValues = sleepData.map(d => d.rem).filter(v => v > 0);
        const efficiencyValues = sleepData.map(d => d.efficiency).filter(v => v > 0);
        const totalValues = sleepData.map(d => d.total).filter(v => v > 0);

        const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
        const trend = arr => {
            if (arr.length < 3) return 'stable';
            const recent = avg(arr.slice(-3));
            const older = avg(arr.slice(0, 3));
            const change = ((recent - older) / older) * 100;
            if (change > 10) return 'improving';
            if (change < -10) return 'declining';
            return 'stable';
        };

        const lastNight = sleepData[sleepData.length - 1] || {};

        return {
            avgDeep: Math.round(avg(deepSleepValues)),
            avgRem: Math.round(avg(remValues)),
            avgEfficiency: Math.round(avg(efficiencyValues)),
            avgTotal: Math.round(avg(totalValues)),
            lastNight: {
                deep: lastNight.deep || 0,
                rem: lastNight.rem || 0,
                efficiency: lastNight.efficiency || 0,
                total: lastNight.total || 0
            },
            deepTrend: trend(deepSleepValues),
            efficiencyTrend: trend(efficiencyValues),
            daysAnalyzed: sleepData.length,
            // Identify best sleep days
            bestDeepSleep: Math.max(...deepSleepValues),
            worstDeepSleep: Math.min(...deepSleepValues),
            deepSleepTarget: 90, // minutes target
            deepSleepDeficit: 90 - Math.round(avg(deepSleepValues))
        };
    },

    /**
     * Analyze activity patterns
     */
    analyzeActivityPatterns(data) {
        const activityData = data.last7Days?.values || [];
        const weeklyData = data.weeklyComparison || {};

        if (activityData.length < 3) return null;

        const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
        const validSteps = activityData.filter(v => v > 0);

        return {
            avgSteps: Math.round(avg(validSteps)),
            todaySteps: data.today?.steps || 0,
            activeDays: data.metrics?.activeDays || 0,
            currentStreak: data.metrics?.currentStreak || 0,
            longestStreak: data.metrics?.longestStreak || 0,
            weeklyTrend: weeklyData.steps ?
                (weeklyData.steps[3] > weeklyData.steps[2] ? 'improving' : 'declining') : 'stable',
            bestDay: data.metrics?.bestDaySteps || 0,
            bestDayLabel: data.metrics?.bestDayLabel || '',
            consistency: data.metrics?.consistency || 0,
            stepsToGoal: Math.max(0, 10000 - (data.today?.steps || 0)),
            workoutsThisWeek: data.thisWeek?.workouts || 0
        };
    },

    /**
     * Analyze recovery patterns
     */
    analyzeRecoveryPatterns(data) {
        const hrvData = data.hrv || {};
        const readiness = data.readinessBreakdown || {};

        return {
            currentHrv: hrvData.current || 0,
            baselineHrv: hrvData.baseline || 0,
            hrvStatus: hrvData.status || 'unknown',
            hrvTrend: hrvData.trend7Days || [],
            hrvDeviation: hrvData.current && hrvData.baseline ?
                Math.round(((hrvData.current - hrvData.baseline) / hrvData.baseline) * 100) : 0,
            readinessScore: data.todayScores?.readiness || readiness.score || 0,
            recoveryIndex: readiness.recoveryIndex || 0,
            restingHR: data.metrics?.restingHR || 0,
            bodyTemp: readiness.tempDeviation || 0,
            // Contributors
            activityBalance: readiness.activityBalance || 0,
            sleepBalance: readiness.sleepBalance || 0,
            previousNight: readiness.previousNight || 0
        };
    },

    /**
     * Analyze stress patterns
     */
    analyzeStressPatterns(data) {
        const stress = data.stress || {};
        if (!stress.available) return null;

        const records = stress.records || [];
        const stressfulDays = records.filter(r => r.daySummary === 'stressful').length;
        const restoredDays = records.filter(r => r.daySummary === 'restored').length;

        return {
            todayStress: stress.today?.stressMinutes || 0,
            todayRecovery: stress.today?.recoveryMinutes || 0,
            todaySummary: stress.today?.summary || 'unknown',
            avgStress: stress.avgStressMinutes || 0,
            avgRecovery: stress.avgRecoveryMinutes || 0,
            stressfulDaysRatio: records.length ? Math.round((stressfulDays / records.length) * 100) : 0,
            restoredDaysRatio: records.length ? Math.round((restoredDays / records.length) * 100) : 0,
            trend: stress.trend7Days || []
        };
    },

    /**
     * Find correlations between metrics
     */
    findCorrelations(data) {
        const correlations = [];
        const sleepData = data.sleepStages?.last7Days || [];
        const hrvTrend = data.hrv?.trend7Days || [];

        // Deep sleep vs HRV correlation
        if (sleepData.length >= 5 && hrvTrend.length >= 5) {
            const deepValues = sleepData.slice(-5).map(d => d.deep);
            const hrvValues = hrvTrend.slice(-5);

            // Simple correlation check
            const avgDeep = deepValues.reduce((a, b) => a + b, 0) / deepValues.length;
            const avgHrv = hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length;

            const highDeepDays = deepValues.filter(d => d > avgDeep);
            const correspondingHrv = hrvValues.slice(-highDeepDays.length);
            const highDeepAvgHrv = correspondingHrv.length ?
                correspondingHrv.reduce((a, b) => a + b, 0) / correspondingHrv.length : avgHrv;

            if (highDeepAvgHrv > avgHrv * 1.1) {
                correlations.push({
                    type: 'positive',
                    factor1: 'Deep Sleep',
                    factor2: 'HRV',
                    insight: `When you get more deep sleep, your HRV tends to be ${Math.round((highDeepAvgHrv / avgHrv - 1) * 100)}% higher`
                });
            }
        }

        // Activity vs Sleep correlation
        const stepsData = data.last7Days?.values || [];
        if (stepsData.length >= 5 && sleepData.length >= 5) {
            const highStepDays = stepsData.filter(s => s > 10000).length;
            const avgEfficiencyHighStep = sleepData
                .filter((_, i) => stepsData[i] > 10000)
                .map(d => d.efficiency)
                .filter(e => e > 0);

            if (avgEfficiencyHighStep.length > 0) {
                const avgEff = avgEfficiencyHighStep.reduce((a, b) => a + b, 0) / avgEfficiencyHighStep.length;
                if (avgEff > 85) {
                    correlations.push({
                        type: 'positive',
                        factor1: 'Steps > 10k',
                        factor2: 'Sleep Efficiency',
                        insight: `On days you hit 10k+ steps, your sleep efficiency averages ${Math.round(avgEff)}%`
                    });
                }
            }
        }

        return correlations;
    },

    /**
     * Generate smart insight based on patterns
     */
    generateLocalInsight(data) {
        const patterns = this.analyzePatterns(data);
        const insights = [];
        const recommendations = [];

        const todayScores = data.todayScores || {};
        const sleep = todayScores.sleep || data.metrics?.sleepScore || 0;
        const readiness = todayScores.readiness || data.readinessBreakdown?.score || 0;
        const activity = todayScores.activity || data.metrics?.activityScore || 0;

        // Priority-based insight generation

        // 1. Check for low recovery - highest priority
        if (readiness < 60) {
            insights.push(`Your readiness is at ${readiness} - your body needs recovery today.`);
            recommendations.push('Keep activity light - a 20-30 minute walk is ideal');
            recommendations.push('Prioritize sleep tonight - aim for 8+ hours');
            if (patterns.recovery?.hrvDeviation < -10) {
                recommendations.push(`Your HRV is ${Math.abs(patterns.recovery.hrvDeviation)}% below baseline - stress may be elevated`);
            }
        }
        // 2. Check for great recovery - opportunity day
        else if (readiness >= 85 && sleep >= 80) {
            insights.push(`Excellent scores today! Readiness ${readiness}, Sleep ${sleep} - you're primed for performance.`);
            recommendations.push('Great day for high-intensity training or challenging work');
            if (patterns.activity?.currentStreak > 0) {
                recommendations.push(`Keep your ${patterns.activity.currentStreak}-day streak going!`);
            }
        }
        // 3. Good but not great
        else if (readiness >= 70) {
            insights.push(`Good recovery today with readiness at ${readiness}.`);

            // Add specific observations
            if (patterns.sleep?.lastNight?.deep < patterns.sleep?.avgDeep) {
                insights.push(`Deep sleep was ${patterns.sleep.lastNight.deep} min (below your ${patterns.sleep.avgDeep} min average).`);
                recommendations.push('Try limiting screen time and caffeine after 2pm for better deep sleep');
            }

            if (patterns.recovery?.hrvDeviation > 15) {
                insights.push(`HRV is ${patterns.recovery.hrvDeviation}% above baseline - great recovery signal.`);
                recommendations.push('Your body is well-recovered - good day for a workout');
            }
        }

        // 4. Add activity context
        if (patterns.activity) {
            const stepsToGo = patterns.activity.stepsToGoal;
            if (stepsToGo > 0 && stepsToGo < 5000) {
                recommendations.push(`Just ${stepsToGo.toLocaleString()} steps to hit 10k - a short walk will do it!`);
            } else if (patterns.activity.todaySteps >= 10000) {
                insights.push(`Already hit ${patterns.activity.todaySteps.toLocaleString()} steps today!`);
            }
        }

        // 5. Add stress context
        if (patterns.stress && patterns.stress.todayStress > 120) {
            recommendations.push(`High stress detected (${patterns.stress.todayStress} min) - consider breathing exercises or a short walk`);
        }

        // 6. Add trend context
        if (patterns.sleep?.deepTrend === 'declining') {
            recommendations.push('Your deep sleep has been declining - consider earlier bedtime or reducing alcohol');
        } else if (patterns.sleep?.deepTrend === 'improving') {
            insights.push('Your deep sleep trend is improving - keep up the good habits!');
        }

        // 7. Add streak motivation
        if (patterns.activity?.currentStreak >= 7) {
            insights.push(`Amazing ${patterns.activity.currentStreak}-day activity streak!`);
        }

        // Compile final insight
        return {
            headline: insights[0] || `Readiness: ${readiness}, Sleep: ${sleep}, Activity: ${activity}`,
            details: insights.slice(1),
            recommendations: recommendations.slice(0, 3), // Top 3 recommendations
            patterns: patterns
        };
    },

    /**
     * Call Claude API for truly personalized insight
     */
    async generateAIInsight(data, apiKey) {
        // Check cache first
        const cacheKey = data.lastUpdated;
        if (this.cache[cacheKey] && Date.now() - this.cache[cacheKey].timestamp < this.cacheExpiry) {
            return this.cache[cacheKey].insight;
        }

        const patterns = this.analyzePatterns(data);
        const todayScores = data.todayScores || {};

        const prompt = `You are a personal health coach analyzing Oura Ring data. Be concise, specific, and actionable.

TODAY'S SCORES:
- Sleep: ${todayScores.sleep || 'N/A'} (7-day avg: ${data.metrics?.sleepScore || 'N/A'})
- Readiness: ${todayScores.readiness || 'N/A'} (7-day avg: ${data.metrics?.readinessScore || 'N/A'})
- Activity: ${todayScores.activity || 'N/A'}

SLEEP DATA (Last Night):
- Deep Sleep: ${patterns.sleep?.lastNight?.deep || 'N/A'} min (avg: ${patterns.sleep?.avgDeep || 'N/A'} min, target: 90 min)
- REM Sleep: ${patterns.sleep?.lastNight?.rem || 'N/A'} min (avg: ${patterns.sleep?.avgRem || 'N/A'} min)
- Efficiency: ${patterns.sleep?.lastNight?.efficiency || 'N/A'}% (avg: ${patterns.sleep?.avgEfficiency || 'N/A'}%)
- Deep Sleep Trend: ${patterns.sleep?.deepTrend || 'N/A'}

RECOVERY DATA:
- HRV: ${patterns.recovery?.currentHrv || 'N/A'} ms (baseline: ${patterns.recovery?.baselineHrv || 'N/A'} ms, ${patterns.recovery?.hrvDeviation > 0 ? '+' : ''}${patterns.recovery?.hrvDeviation || 0}%)
- Resting HR: ${patterns.recovery?.restingHR || 'N/A'} bpm
- Body Temp Deviation: ${patterns.recovery?.bodyTemp || 0}°

ACTIVITY DATA:
- Today's Steps: ${patterns.activity?.todaySteps?.toLocaleString() || 'N/A'}
- Current Streak: ${patterns.activity?.currentStreak || 0} days
- Workouts This Week: ${patterns.activity?.workoutsThisWeek || 0}

STRESS DATA:
- Today's Stress: ${patterns.stress?.todayStress || 'N/A'} min high stress
- Today's Recovery: ${patterns.stress?.todayRecovery || 'N/A'} min recovery time
- Stress/Recovery Trend: ${patterns.stress?.stressfulDaysRatio || 0}% stressful days recently

Based on this data, provide:
1. A brief headline insight (1 sentence, be specific with numbers)
2. The most important recommendation for today (1 sentence)
3. One pattern you notice in the data (1 sentence)

Format your response as JSON:
{"headline": "...", "recommendation": "...", "pattern": "..."}`;

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: 'claude-3-5-haiku-20241022',
                    max_tokens: 300,
                    messages: [{
                        role: 'user',
                        content: prompt
                    }]
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const result = await response.json();
            const text = result.content[0].text;

            // Parse JSON response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const insight = JSON.parse(jsonMatch[0]);

                // Cache the result
                this.cache[cacheKey] = {
                    insight: insight,
                    timestamp: Date.now()
                };

                return insight;
            }

            throw new Error('Could not parse AI response');
        } catch (error) {
            console.error('AI Coach error:', error);
            // Fallback to local insight
            const local = this.generateLocalInsight(data);
            return {
                headline: local.headline,
                recommendation: local.recommendations[0] || 'Focus on consistent sleep and activity today.',
                pattern: local.details[0] || 'Keep tracking for more personalized insights.'
            };
        }
    },

    /**
     * Get the daily insight - tries AI first, falls back to local
     */
    async getDailyInsight(data, apiKey = null) {
        if (apiKey) {
            return await this.generateAIInsight(data, apiKey);
        }

        const local = this.generateLocalInsight(data);
        return {
            headline: local.headline,
            recommendation: local.recommendations[0] || 'Focus on recovery and consistent habits.',
            pattern: local.details[0] || null
        };
    }
};

// Export for use in browser
if (typeof window !== 'undefined') {
    window.AICoach = AICoach;
}
