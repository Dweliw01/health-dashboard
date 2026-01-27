/**
 * Local API Server for Health Dashboard
 * Handles AI insight generation when running locally
 *
 * Usage:
 * 1. Create a .env file with: ANTHROPIC_API_KEY=your-key-here
 * 2. Run: node local-api-server.js
 * 3. The server will run on port 3001
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Load .env file if it exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

const PORT = 3001;

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

async function callClaudeAPI(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured. Create a .env file with your API key.');
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
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`API error: ${response.status} - ${error.error?.message || 'Unknown'}`);
  }

  const result = await response.json();
  return result.content[0].text;
}

async function handleInsightRequest(type, data) {
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
      throw new Error('Invalid insight type');
  }

  const content = await callClaudeAPI(prompt);

  // Try to parse JSON
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    // Return as text if not JSON
  }

  return { text: content };
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/generate-insight') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const { type, data } = JSON.parse(body);
        const result = await handleInsightRequest(type, data);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (error) {
        console.error('Error:', error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           Health Dashboard - Local API Server              ║
╠════════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${PORT}                  ║
║  API endpoint: http://localhost:${PORT}/api/generate-insight  ║
╠════════════════════════════════════════════════════════════╣
║  Make sure you have created a .env file with:              ║
║  ANTHROPIC_API_KEY=your-api-key-here                       ║
╚════════════════════════════════════════════════════════════╝
  `);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('\n⚠️  WARNING: ANTHROPIC_API_KEY not found in .env file');
    console.log('   Create a .env file in this directory with your API key.\n');
  } else {
    console.log('\n✓ API key loaded from .env file\n');
  }
});
