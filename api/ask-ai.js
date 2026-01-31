// Server-side AI endpoint - keeps API key secure on server
// Only called when user explicitly requests AI insights

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get API key from environment variable (NEVER exposed to client)
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'AI not configured', configured: false });
  }

  try {
    const { question, healthContext, type = 'question' } = req.body;

    if (!question && type === 'question') {
      return res.status(400).json({ error: 'No question provided' });
    }

    // Build the prompt based on type
    let systemPrompt = '';
    let userMessage = question;

    if (type === 'question') {
      systemPrompt = `You are a knowledgeable health coach analyzing Oura Ring data and lifestyle factors.

Guidelines:
- Be specific and reference actual numbers from the data
- Provide actionable, science-backed recommendations
- Be encouraging but honest about areas for improvement
- Keep responses concise (2-4 paragraphs max)
- If data is missing (N/A), acknowledge it and work with what's available
- Focus on patterns and correlations in the data

${healthContext || ''}`;
    } else if (type === 'insight') {
      systemPrompt = `You are a personal health coach. Analyze the health data and provide:
1. A brief headline insight (1 sentence with specific numbers)
2. One actionable recommendation for today
3. One pattern you notice

Format as JSON: {"headline": "...", "recommendation": "...", "pattern": "..."}

${healthContext || ''}`;
      userMessage = 'Analyze my health data and provide today\'s insight.';
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
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: userMessage
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Anthropic API error:', errorData);
      return res.status(response.status).json({
        error: 'AI request failed',
        details: errorData.error?.message || 'Unknown error'
      });
    }

    const result = await response.json();
    const answer = result.content[0].text;

    // For insight type, try to parse JSON
    if (type === 'insight') {
      try {
        const jsonMatch = answer.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.status(200).json(parsed);
        }
      } catch (e) {
        // Return as plain text if JSON parsing fails
      }
    }

    return res.status(200).json({
      answer,
      model: 'claude-3-5-haiku-20241022'
    });

  } catch (error) {
    console.error('Ask AI error:', error);
    return res.status(500).json({ error: error.message });
  }
}
