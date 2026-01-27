/**
 * Vercel Serverless Function - AI Insight Generation
 * Uses Claude API to generate personalized health insights
 */

// Prompt templates
const InsightPrompts = {
  dailyInsight: (data) => `
You are a personal health coach analyzing data for a user focused on peak physical performance.

USER DATA SUMMARY:
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
You are a personal health coach providing a weekly review.

USER DATA:
${JSON.stringify(data.summary, null, 2)}

Provide a comprehensive weekly analysis including:
1. Top 2-3 wins this week (be specific with numbers)
2. One area that needs attention
3. A grade for the week
4. Specific goals for next week

Format your response as valid JSON:
{
  "wins": ["win1 with numbers", "win2 with numbers"],
  "needsAttention": "specific area and recommendation",
  "overallScore": "A/B/C grade",
  "nextWeekGoals": ["goal1", "goal2"],
  "encouragement": "brief motivational message"
}

Return ONLY valid JSON, no other text.
`,

  answerQuestion: (data) => `
You are a health data analyst. A user asked about their health data:
"${data.question}"

Their current data:
${JSON.stringify(data.summary, null, 2)}

Answer their question based ONLY on their actual data. Be specific with numbers.
If you can't fully answer from the data available, acknowledge that.
Keep your response under 100 words.
Be direct and helpful.
`,

  predictTomorrow: (data) => `
Based on today's data and patterns, predict tomorrow's likely state.

TODAY'S DATA:
${JSON.stringify(data.summary, null, 2)}

PATTERNS:
${JSON.stringify(data.correlations, null, 2)}

Predict:
1. Likely readiness level (1-100)
2. Recommended activity level
3. Any warnings based on patterns
4. One tip to optimize tomorrow

Format your response as valid JSON:
{
  "predictedReadiness": 75,
  "confidence": "high|medium|low",
  "recommendation": "activity recommendation",
  "warning": "any concerns or null",
  "tip": "optimization tip"
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
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
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
