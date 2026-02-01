/**
 * Vercel Serverless Function - AI Insight Generation
 * Uses Claude API to generate personalized health insights
 */

// Prompt templates
const InsightPrompts = {
  dailyInsight: (data) => `
You are a personal health coach analyzing comprehensive Oura Ring data for a user focused on peak physical performance.

AVAILABLE DATA CATEGORIES:
- Today: steps, calories, heart rate, readiness, HRV, sleep stages (deep/REM/light/awake), sleep efficiency, breath rate, stress/recovery minutes, SpO2
- This Week: average steps, calories, workouts
- HRV: current, baseline, 7-day and 30-day averages, trends
- Sleep: last night details, 7-day history, averages (deep, REM, light, efficiency, latency, breath rate)
- Stress: today's stress/recovery balance, 7-day trend, averages
- SpO2: current blood oxygen, baseline, trend
- Readiness Breakdown: activity balance, body temperature, HRV balance, previous day activity, recovery index, resting HR, temp deviation
- Activity: step trends, heart rate trends (avg/max/min), workout distribution by type, time-of-day patterns
- Trends: weekly comparisons, projections, performance changes
- Alerts: any health warnings detected
- Context: tracking streaks, consistency

USER DATA:
${JSON.stringify(data.summary, null, 2)}

CORRELATIONS FOUND:
${JSON.stringify(data.correlations, null, 2)}

ANOMALIES DETECTED:
${JSON.stringify(data.anomalies, null, 2)}

Generate ONE specific, actionable insight based on this data. The insight should:
1. Reference specific numbers from their data
2. Identify a pattern or correlation they might not notice
3. Give ONE specific action they can take today
4. Be encouraging but honest
5. Be concise (2-3 sentences max)

Format your response as valid JSON:
{
  "insight": "Your main insight in 1-2 sentences with specific numbers",
  "action": "One specific thing to do today",
  "dataPoint": "The key number that supports this",
  "category": "sleep|activity|recovery|nutrition|consistency"
}

Return ONLY valid JSON, no other text.
`,

  weeklyAnalysis: (data) => `
You are a personal health coach providing a comprehensive weekly review based on Oura Ring data.

AVAILABLE DATA:
- Metrics: daily averages, active days, workout count, streaks, fitness/sleep/readiness scores
- Sleep: nightly breakdown (deep/REM/light), efficiency trends, breath rate, latency
- HRV: current vs baseline, weekly trends, recovery status
- Stress: stress vs recovery balance, daily patterns
- Activity: step trends, heart rate patterns, workout distribution, weekly comparisons
- Readiness: all contributing factors and breakdowns
- Trends: week-over-week changes, projections

USER DATA:
${JSON.stringify(data.summary, null, 2)}

Provide a comprehensive weekly analysis including:
1. Top 2-3 wins this week (be specific with numbers from their data)
2. One area that needs attention (with specific data points)
3. A grade for the week (A+, A, B+, B, B-, C+, C)
4. Specific, actionable goals for next week

Format your response as valid JSON:
{
  "wins": ["win1 with specific numbers", "win2 with specific numbers"],
  "needsAttention": "specific area with data and recommendation",
  "overallScore": "A/B/C grade with +/-",
  "nextWeekGoals": ["specific goal 1", "specific goal 2"],
  "encouragement": "brief motivational message"
}

Return ONLY valid JSON, no other text.
`,

  answerQuestion: (data) => `
You are a health data analyst with access to comprehensive Oura Ring data. A user asked:
"${data.question}"

AVAILABLE DATA INCLUDES:
- Today's metrics: steps, calories, heart rate, HRV, sleep stages, breath rate, stress/recovery, SpO2
- Sleep analysis: deep/REM/light sleep minutes, efficiency, latency, last 7 nights history
- HRV data: current, baseline, 7-day and 30-day averages and trends
- Stress data: stress vs recovery minutes, daily summaries
- Readiness breakdown: all contributing factors (activity balance, body temp, recovery index, etc.)
- Activity patterns: step trends, heart rate trends (avg/max/min), workout distribution, time-of-day activity
- Weekly/monthly comparisons and projections
- Health alerts and anomalies
- Nutrition tracking (if logged): water, protein, food quality
- Check-in data (if logged): mood, energy levels

USER'S COMPLETE DATA:
${JSON.stringify(data.summary, null, 2)}

Answer their question using ONLY their actual data. Be specific with numbers.
If the data doesn't contain what they're asking about, say so clearly.
Keep your response concise but thorough (under 150 words).
Be direct, helpful, and reference specific numbers when possible.
`,

  predictTomorrow: (data) => `
Based on comprehensive Oura Ring data and patterns, predict tomorrow's likely state.

PREDICTION FACTORS TO CONSIDER:
- Current HRV vs baseline (recovery indicator)
- Last night's sleep quality, efficiency, and stages
- Stress vs recovery balance today
- Recent activity load (steps, workouts)
- Readiness breakdown factors
- SpO2 and breath rate trends
- Week-over-week patterns

TODAY'S COMPLETE DATA:
${JSON.stringify(data.summary, null, 2)}

DETECTED PATTERNS:
${JSON.stringify(data.correlations, null, 2)}

Predict:
1. Likely readiness level (1-100) based on recovery indicators
2. Recommended activity intensity (rest/light/moderate/intense)
3. Any warnings based on the data patterns
4. One specific tip to optimize tomorrow

Format your response as valid JSON:
{
  "predictedReadiness": 75,
  "confidence": "high|medium|low",
  "recommendation": "specific activity recommendation with reasoning",
  "warning": "any concerns based on data or null",
  "tip": "specific optimization tip based on their patterns"
}

Return ONLY valid JSON, no other text.
`
};

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, data } = req.body;

  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'API key not configured',
      message: 'Please add ANTHROPIC_API_KEY to your Vercel environment variables'
    });
  }

  // Validate request
  if (!type || !data) {
    return res.status(400).json({ error: 'Missing type or data' });
  }

  try {
    let prompt;

    switch (type) {
      case 'daily':
        prompt = InsightPrompts.dailyInsight(data);
        break;
      case 'weekly':
        prompt = InsightPrompts.weeklyAnalysis(data);
        break;
      case 'question':
        prompt = InsightPrompts.answerQuestion(data);
        break;
      case 'predict':
        prompt = InsightPrompts.predictTomorrow(data);
        break;
      default:
        return res.status(400).json({ error: 'Invalid insight type' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const result = await response.json();
    const content = result.content[0].text;

    // Try to parse JSON from response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return res.status(200).json(parsed);
      }
    } catch (parseError) {
      // If not JSON, return as text (for question answers)
      return res.status(200).json({ text: content });
    }

    // Return raw text if no JSON found
    return res.status(200).json({ text: content });

  } catch (error) {
    console.error('Insight generation error:', error);
    return res.status(500).json({
      error: 'Failed to generate insight',
      message: error.message
    });
  }
}
