/**
 * Check-in Manager - Daily check-in data management
 * Handles workout logging, energy/mood tracking, tags, and streaks
 */

const CheckinManager = {
  STORAGE_KEY: 'health_dashboard_checkins',

  // Predefined tags (professional icons will be SVG in UI)
  TAGS: {
    great_day: { label: 'Great Day', category: 'positive', color: '#10b981' },
    good_sleep: { label: 'Good Sleep', category: 'positive', color: '#10b981' },
    productive: { label: 'Productive', category: 'positive', color: '#10b981' },
    rest_day: { label: 'Rest Day', category: 'neutral', color: '#6b7280' },
    travel: { label: 'Travel', category: 'neutral', color: '#6b7280' },
    busy: { label: 'Busy Day', category: 'neutral', color: '#6b7280' },
    sick: { label: 'Sick', category: 'negative', color: '#ef4444' },
    poor_sleep: { label: 'Poor Sleep', category: 'negative', color: '#ef4444' },
    stress: { label: 'High Stress', category: 'negative', color: '#f59e0b' },
    alcohol: { label: 'Alcohol', category: 'negative', color: '#f59e0b' },
    meditation: { label: 'Meditation', category: 'positive', color: '#8b5cf6' },
    cold_exposure: { label: 'Cold Exposure', category: 'positive', color: '#06b6d4' }
  },

  // Workout types
  WORKOUT_TYPES: [
    { id: 'strength', label: 'Strength' },
    { id: 'cardio', label: 'Cardio' },
    { id: 'hiit', label: 'HIIT' },
    { id: 'yoga', label: 'Yoga' },
    { id: 'sport', label: 'Sport' },
    { id: 'walking', label: 'Walking' },
    { id: 'other', label: 'Other' }
  ],

  // Intensity levels
  INTENSITIES: [
    { id: 'low', label: 'Light' },
    { id: 'medium', label: 'Medium' },
    { id: 'high', label: 'Hard' }
  ],

  /**
   * Get date string in YYYY-MM-DD format (local time, not UTC)
   */
  getDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Load all check-in data
   */
  load() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (err) {
      console.warn('Failed to load check-ins:', err);
    }
    return {
      checkins: [],
      streaks: { current: 0, longest: 0, lastCheckin: null },
      customTags: []
    };
  },

  /**
   * Save check-in data
   */
  save(data) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (err) {
      console.error('Failed to save check-ins:', err);
      return false;
    }
  },

  /**
   * Get today's check-in if exists
   */
  getTodayCheckin() {
    const today = this.getDateString(new Date());
    const data = this.load();
    return data.checkins.find(c => c.date === today) || null;
  },

  /**
   * Check if user has checked in today
   */
  hasCheckedInToday() {
    return this.getTodayCheckin() !== null;
  },

  /**
   * Save or update today's check-in
   */
  saveCheckin(checkin) {
    const data = this.load();
    const today = this.getDateString(new Date());

    // Remove existing check-in for today if exists
    data.checkins = data.checkins.filter(c => c.date !== today);

    // Add new check-in
    const newCheckin = {
      id: today,
      date: today,
      timestamp: new Date().toISOString(),
      workout: checkin.workout || null,
      energy: checkin.energy || null,
      mood: checkin.mood || null,
      tags: checkin.tags || [],
      notes: checkin.notes || '',
      metadata: {
        source: 'manual',
        version: 1
      }
    };

    data.checkins.push(newCheckin);

    // Update streaks
    this.updateStreaks(data);

    this.save(data);
    return newCheckin;
  },

  /**
   * Update a specific date's check-in
   */
  updateCheckin(date, updates) {
    const data = this.load();
    const index = data.checkins.findIndex(c => c.date === date);

    if (index >= 0) {
      data.checkins[index] = {
        ...data.checkins[index],
        ...updates,
        timestamp: new Date().toISOString()
      };
      this.save(data);
      return data.checkins[index];
    }
    return null;
  },

  /**
   * Delete a check-in
   */
  deleteCheckin(date) {
    const data = this.load();
    data.checkins = data.checkins.filter(c => c.date !== date);
    this.updateStreaks(data);
    this.save(data);
  },

  /**
   * Update streak calculations
   */
  updateStreaks(data) {
    if (data.checkins.length === 0) {
      data.streaks = { current: 0, longest: 0, lastCheckin: null };
      return;
    }

    // Sort by date descending
    const sorted = [...data.checkins].sort((a, b) =>
      new Date(b.date) - new Date(a.date)
    );

    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate current streak (counting back from today or yesterday)
    for (let i = 0; i < sorted.length; i++) {
      const checkinDate = new Date(sorted[i].date);
      checkinDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);

      const diffDays = Math.round((expectedDate - checkinDate) / (1000 * 60 * 60 * 24));

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
    const chronological = [...data.checkins].sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    );

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

    data.streaks = {
      current: currentStreak,
      longest: Math.max(longestStreak, data.streaks?.longest || 0),
      lastCheckin: sorted[0]?.date || null
    };
  },

  /**
   * Get check-in history for specified days
   */
  getHistory(days = 30) {
    const data = this.load();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return data.checkins
      .filter(c => new Date(c.date) >= cutoff)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  /**
   * Get check-in for a specific date
   */
  getCheckin(date) {
    const data = this.load();
    return data.checkins.find(c => c.date === date) || null;
  },

  /**
   * Get streaks
   */
  getStreaks() {
    const data = this.load();
    return data.streaks;
  },

  /**
   * Get workout statistics
   */
  getWorkoutStats(days = 30) {
    const history = this.getHistory(days);
    const workouts = history.filter(c => c.workout?.completed);

    // Count by type
    const byType = {};
    workouts.forEach(c => {
      const type = c.workout.type || 'other';
      byType[type] = (byType[type] || 0) + 1;
    });

    // Average duration
    const durations = workouts.map(c => c.workout.duration).filter(d => d > 0);
    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

    // Intensity distribution
    const intensities = { low: 0, medium: 0, high: 0 };
    workouts.forEach(c => {
      if (c.workout.intensity) {
        intensities[c.workout.intensity]++;
      }
    });

    return {
      total: workouts.length,
      days: history.length,
      byType,
      avgDuration,
      intensities,
      thisWeek: workouts.filter(c => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(c.date) >= weekAgo;
      }).length
    };
  },

  /**
   * Get energy statistics
   */
  getEnergyStats(days = 30) {
    const history = this.getHistory(days);
    const withEnergy = history.filter(c => c.energy != null);

    if (withEnergy.length === 0) {
      return { average: null, distribution: {}, trend: null };
    }

    const avg = withEnergy.reduce((sum, c) => sum + c.energy, 0) / withEnergy.length;

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    withEnergy.forEach(c => {
      distribution[c.energy]++;
    });

    // Trend (last 7 vs previous 7)
    const last7 = withEnergy.slice(0, 7);
    const prev7 = withEnergy.slice(7, 14);

    let trend = null;
    if (last7.length >= 3 && prev7.length >= 3) {
      const last7Avg = last7.reduce((s, c) => s + c.energy, 0) / last7.length;
      const prev7Avg = prev7.reduce((s, c) => s + c.energy, 0) / prev7.length;
      trend = last7Avg - prev7Avg;
    }

    return {
      average: Math.round(avg * 10) / 10,
      distribution,
      trend
    };
  },

  /**
   * Get tag frequency
   */
  getTagStats(days = 30) {
    const history = this.getHistory(days);
    const tagCounts = {};

    history.forEach(c => {
      (c.tags || []).forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({
        tag,
        label: this.TAGS[tag]?.label || tag,
        count,
        percentage: Math.round((count / history.length) * 100)
      }));
  },

  /**
   * Add custom tag
   */
  addCustomTag(tag) {
    const data = this.load();
    if (!data.customTags.includes(tag)) {
      data.customTags.push(tag);
      this.save(data);
    }
  },

  /**
   * Get all available tags (predefined + custom)
   */
  getAllTags() {
    const data = this.load();
    const allTags = { ...this.TAGS };

    data.customTags.forEach(tag => {
      if (!allTags[tag]) {
        allTags[tag] = { label: tag, category: 'custom', color: '#8b5cf6' };
      }
    });

    return allTags;
  },

  /**
   * Export check-in data
   */
  export() {
    return {
      ...this.load(),
      exportedAt: new Date().toISOString()
    };
  },

  /**
   * Import check-in data
   */
  import(data) {
    try {
      if (data.checkins) {
        this.save({
          checkins: data.checkins,
          streaks: data.streaks || { current: 0, longest: 0, lastCheckin: null },
          customTags: data.customTags || []
        });
        return true;
      }
    } catch (err) {
      console.error('Failed to import check-ins:', err);
    }
    return false;
  }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CheckinManager;
}
