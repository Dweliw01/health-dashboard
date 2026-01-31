/**
 * Nutrition Manager - Data layer for nutrition tracking
 * Handles water intake, protein tracking, food quality, and meal logging
 */

const NutritionManager = {
  STORAGE_KEY: 'health_dashboard_nutrition',

  // Default goals
  defaultGoals: {
    waterGlasses: 8,
    proteinGrams: 150,
    useSimpleProtein: true // true = Low/Med/High, false = exact grams
  },

  // Protein level definitions
  PROTEIN_LEVELS: {
    low: { label: 'Low', range: '<100g', min: 0, max: 99 },
    medium: { label: 'Medium', range: '100-140g', min: 100, max: 140 },
    high: { label: 'High', range: '140g+', min: 141, max: 999 }
  },

  // Food quality descriptions
  FOOD_QUALITY: {
    1: { label: 'Poor', description: 'Mostly processed/fast food' },
    2: { label: 'Below Average', description: 'More processed than whole foods' },
    3: { label: 'Balanced', description: 'Mix of whole and processed foods' },
    4: { label: 'Good', description: 'Mostly whole foods' },
    5: { label: 'Excellent', description: 'All whole, nutritious foods' }
  },

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
   * Load all nutrition data
   */
  load() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (err) {
      console.warn('Failed to load nutrition data:', err);
    }
    return {
      version: 1,
      goals: { ...this.defaultGoals },
      entries: [],
      stats: {}
    };
  },

  /**
   * Save nutrition data
   */
  save(data) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (err) {
      console.error('Failed to save nutrition data:', err);
      return false;
    }
  },

  /**
   * Get or create today's entry
   */
  getTodayEntry() {
    const data = this.load();
    const today = this.getDateString(new Date());
    let entry = data.entries.find(e => e.date === today);

    if (!entry) {
      entry = {
        date: today,
        water: { glasses: 0, logs: [] },
        protein: { rating: null, grams: null },
        foodQuality: null,
        meals: [],
        notes: ''
      };
      data.entries.push(entry);
      this.save(data);
    }

    return entry;
  },

  /**
   * Update today's entry
   */
  updateTodayEntry(updates) {
    const data = this.load();
    const today = this.getDateString(new Date());
    const index = data.entries.findIndex(e => e.date === today);

    if (index >= 0) {
      data.entries[index] = { ...data.entries[index], ...updates };
    } else {
      data.entries.push({
        date: today,
        water: { glasses: 0, logs: [] },
        protein: { rating: null, grams: null },
        foodQuality: null,
        meals: [],
        notes: '',
        ...updates
      });
    }

    this.save(data);
    this.updateStats(data);
    return this.getTodayEntry();
  },

  // ==================== WATER TRACKING ====================

  /**
   * Get today's water intake
   */
  getWaterToday() {
    const entry = this.getTodayEntry();
    return entry.water || { glasses: 0, logs: [] };
  },

  /**
   * Add water
   */
  addWater(amount = 1) {
    const data = this.load();
    const today = this.getDateString(new Date());
    let entry = data.entries.find(e => e.date === today);

    if (!entry) {
      entry = {
        date: today,
        water: { glasses: 0, logs: [] },
        protein: { rating: null, grams: null },
        foodQuality: null,
        meals: []
      };
      data.entries.push(entry);
    }

    if (!entry.water) {
      entry.water = { glasses: 0, logs: [] };
    }

    entry.water.glasses += amount;
    entry.water.logs.push({
      time: new Date().toTimeString().slice(0, 5),
      amount
    });

    this.save(data);
    return entry.water;
  },

  /**
   * Remove water
   */
  removeWater(amount = 1) {
    const data = this.load();
    const today = this.getDateString(new Date());
    const entry = data.entries.find(e => e.date === today);

    if (entry && entry.water && entry.water.glasses > 0) {
      entry.water.glasses = Math.max(0, entry.water.glasses - amount);
      this.save(data);
    }

    return this.getWaterToday();
  },

  /**
   * Get water progress
   */
  getWaterProgress() {
    const water = this.getWaterToday();
    const data = this.load();
    const goal = data.goals?.waterGlasses || this.defaultGoals.waterGlasses;

    return {
      current: water.glasses,
      goal: goal,
      percentage: Math.min(100, Math.round((water.glasses / goal) * 100)),
      remaining: Math.max(0, goal - water.glasses),
      logs: water.logs || []
    };
  },

  // ==================== ENERGY TRACKING ====================

  /**
   * Get today's energy logs
   */
  getEnergyToday() {
    const entry = this.getTodayEntry();
    return entry.energy || { logs: [] };
  },

  /**
   * Add energy reading
   */
  addEnergy(level) {
    const data = this.load();
    const today = this.getDateString(new Date());
    let entry = data.entries.find(e => e.date === today);

    if (!entry) {
      entry = {
        date: today,
        water: { glasses: 0, logs: [] },
        energy: { logs: [] },
        protein: { rating: null, grams: null },
        foodQuality: null,
        meals: []
      };
      data.entries.push(entry);
    }

    if (!entry.energy) {
      entry.energy = { logs: [] };
    }

    entry.energy.logs.push({
      time: new Date().toTimeString().slice(0, 5),
      level: level
    });

    this.save(data);
    return entry.energy;
  },

  /**
   * Get energy progress/summary for today
   */
  getEnergyProgress() {
    const energy = this.getEnergyToday();
    const logs = energy.logs || [];

    if (logs.length === 0) {
      return { logs: [], average: null, latest: null, count: 0 };
    }

    const average = logs.reduce((sum, l) => sum + l.level, 0) / logs.length;
    const latest = logs[logs.length - 1];

    return {
      logs: logs,
      average: Math.round(average * 10) / 10,
      latest: latest,
      count: logs.length
    };
  },

  /**
   * Remove last energy entry
   */
  removeLastEnergy() {
    const data = this.load();
    const today = this.getDateString(new Date());
    const entry = data.entries.find(e => e.date === today);

    if (entry && entry.energy && entry.energy.logs.length > 0) {
      entry.energy.logs.pop();
      this.save(data);
    }

    return this.getEnergyToday();
  },

  // ==================== PROTEIN TRACKING ====================

  /**
   * Get today's protein
   */
  getProteinToday() {
    const entry = this.getTodayEntry();
    return entry.protein || { rating: null, grams: null };
  },

  /**
   * Set protein rating (simple mode)
   */
  setProteinRating(rating) {
    const data = this.load();
    const today = this.getDateString(new Date());
    let entry = data.entries.find(e => e.date === today);

    if (!entry) {
      entry = {
        date: today,
        water: { glasses: 0, logs: [] },
        protein: { rating: null, grams: null },
        foodQuality: null,
        meals: []
      };
      data.entries.push(entry);
    }

    entry.protein = {
      rating: rating,
      grams: this.estimateGramsFromRating(rating)
    };

    this.save(data);
    return entry.protein;
  },

  /**
   * Set protein grams (exact mode)
   */
  setProteinGrams(grams) {
    const data = this.load();
    const today = this.getDateString(new Date());
    let entry = data.entries.find(e => e.date === today);

    if (!entry) {
      entry = {
        date: today,
        water: { glasses: 0, logs: [] },
        protein: { rating: null, grams: null },
        foodQuality: null,
        meals: []
      };
      data.entries.push(entry);
    }

    entry.protein = {
      rating: this.getRatingFromGrams(grams),
      grams: grams
    };

    this.save(data);
    return entry.protein;
  },

  /**
   * Estimate grams from rating
   */
  estimateGramsFromRating(rating) {
    const estimates = {
      low: 70,
      medium: 120,
      high: 160
    };
    return estimates[rating] || null;
  },

  /**
   * Get rating from grams
   */
  getRatingFromGrams(grams) {
    if (grams < 100) return 'low';
    if (grams <= 140) return 'medium';
    return 'high';
  },

  /**
   * Get protein progress
   */
  getProteinProgress() {
    const protein = this.getProteinToday();
    const data = this.load();
    const goal = data.goals?.proteinGrams || this.defaultGoals.proteinGrams;
    const useSimple = data.goals?.useSimpleProtein ?? true;

    return {
      rating: protein.rating,
      grams: protein.grams,
      goal: goal,
      useSimple: useSimple,
      percentage: protein.grams ? Math.round((protein.grams / goal) * 100) : 0
    };
  },

  // ==================== FOOD QUALITY ====================

  /**
   * Get today's food quality
   */
  getFoodQualityToday() {
    const entry = this.getTodayEntry();
    return entry.foodQuality;
  },

  /**
   * Set food quality rating (1-5)
   */
  setFoodQuality(rating) {
    const data = this.load();
    const today = this.getDateString(new Date());
    let entry = data.entries.find(e => e.date === today);

    if (!entry) {
      entry = {
        date: today,
        water: { glasses: 0, logs: [] },
        protein: { rating: null, grams: null },
        foodQuality: null,
        meals: []
      };
      data.entries.push(entry);
    }

    entry.foodQuality = Math.max(1, Math.min(5, rating));

    this.save(data);
    return entry.foodQuality;
  },

  // ==================== MEAL LOGGING ====================

  /**
   * Add a meal
   */
  addMeal(meal) {
    const data = this.load();
    const today = this.getDateString(new Date());
    let entry = data.entries.find(e => e.date === today);

    if (!entry) {
      entry = {
        date: today,
        water: { glasses: 0, logs: [] },
        protein: { rating: null, grams: null },
        foodQuality: null,
        meals: []
      };
      data.entries.push(entry);
    }

    if (!entry.meals) {
      entry.meals = [];
    }

    const newMeal = {
      id: `meal-${Date.now()}`,
      time: new Date().toTimeString().slice(0, 5),
      type: meal.type || 'meal',
      description: meal.description || '',
      photo: meal.photo || null,
      aiAnalysis: meal.aiAnalysis || null,
      userConfirmed: meal.userConfirmed || false,
      notes: meal.notes || ''
    };

    entry.meals.push(newMeal);
    this.save(data);

    // Update protein from meal analysis if available
    if (meal.aiAnalysis?.totals?.protein) {
      this.addProteinFromMeal(meal.aiAnalysis.totals.protein);
    }

    return newMeal;
  },

  /**
   * Add protein from meal (cumulative)
   */
  addProteinFromMeal(proteinGrams) {
    const protein = this.getProteinToday();
    const currentGrams = protein.grams || 0;
    this.setProteinGrams(currentGrams + proteinGrams);
  },

  /**
   * Get today's meals
   */
  getMealsToday() {
    const entry = this.getTodayEntry();
    return entry.meals || [];
  },

  /**
   * Delete a meal
   */
  deleteMeal(mealId) {
    const data = this.load();
    const today = this.getDateString(new Date());
    const entry = data.entries.find(e => e.date === today);

    if (entry && entry.meals) {
      entry.meals = entry.meals.filter(m => m.id !== mealId);
      this.save(data);
    }
  },

  // ==================== GOALS ====================

  /**
   * Get goals
   */
  getGoals() {
    const data = this.load();
    return data.goals || { ...this.defaultGoals };
  },

  /**
   * Update goals
   */
  updateGoals(updates) {
    const data = this.load();
    data.goals = { ...data.goals, ...updates };
    this.save(data);
    return data.goals;
  },

  // ==================== STATISTICS ====================

  /**
   * Update statistics
   */
  updateStats(data) {
    const last7Days = this.getHistory(7);

    if (last7Days.length === 0) {
      data.stats = {};
      return;
    }

    // Water average
    const waterDays = last7Days.filter(e => e.water?.glasses > 0);
    const avgWater = waterDays.length > 0
      ? waterDays.reduce((sum, e) => sum + e.water.glasses, 0) / waterDays.length
      : 0;

    // Protein mode
    const proteinRatings = last7Days.filter(e => e.protein?.rating).map(e => e.protein.rating);
    const proteinMode = this.getMode(proteinRatings);

    // Food quality average
    const qualityDays = last7Days.filter(e => e.foodQuality != null);
    const avgQuality = qualityDays.length > 0
      ? qualityDays.reduce((sum, e) => sum + e.foodQuality, 0) / qualityDays.length
      : 0;

    data.stats = {
      avgWater7Days: Math.round(avgWater * 10) / 10,
      avgProtein7Days: proteinMode,
      avgFoodQuality7Days: Math.round(avgQuality * 10) / 10,
      daysTracked: data.entries.length
    };

    this.save(data);
  },

  /**
   * Get mode (most frequent value)
   */
  getMode(arr) {
    if (arr.length === 0) return null;
    const counts = {};
    arr.forEach(v => counts[v] = (counts[v] || 0) + 1);
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  },

  /**
   * Get history for specified days
   */
  getHistory(days = 7) {
    const data = this.load();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return data.entries
      .filter(e => new Date(e.date) >= cutoff)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  /**
   * Get weekly trends for charts
   */
  getWeeklyTrends() {
    const history = this.getHistory(7);
    const days = [];

    // Build last 7 days array
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = this.getDateString(date);
      const entry = history.find(e => e.date === dateStr);

      days.push({
        date: dateStr,
        dayLabel: date.toLocaleDateString('en-US', { weekday: 'short' }),
        water: entry?.water?.glasses || 0,
        protein: entry?.protein?.rating || null,
        proteinGrams: entry?.protein?.grams || 0,
        foodQuality: entry?.foodQuality || null
      });
    }

    return days;
  },

  /**
   * Get nutrition summary for today
   */
  getTodaySummary() {
    const water = this.getWaterProgress();
    const energy = this.getEnergyProgress();
    const protein = this.getProteinProgress();
    const foodQuality = this.getFoodQualityToday();
    const meals = this.getMealsToday();

    return {
      water,
      energy,
      protein,
      foodQuality,
      foodQualityLabel: foodQuality ? this.FOOD_QUALITY[foodQuality]?.label : null,
      meals,
      mealsCount: meals.length,
      totalMealProtein: meals.reduce((sum, m) => sum + (m.aiAnalysis?.totals?.protein || 0), 0)
    };
  },

  // ==================== EXPORT/IMPORT ====================

  /**
   * Export nutrition data
   */
  export() {
    return {
      ...this.load(),
      exportedAt: new Date().toISOString()
    };
  },

  /**
   * Import nutrition data
   */
  import(data) {
    try {
      if (data.entries) {
        this.save({
          version: data.version || 1,
          goals: data.goals || { ...this.defaultGoals },
          entries: data.entries,
          stats: data.stats || {}
        });
        return true;
      }
    } catch (err) {
      console.error('Failed to import nutrition data:', err);
    }
    return false;
  },

  /**
   * Reset all nutrition data
   */
  reset() {
    this.save({
      version: 1,
      goals: { ...this.defaultGoals },
      entries: [],
      stats: {}
    });
  }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NutritionManager;
}
