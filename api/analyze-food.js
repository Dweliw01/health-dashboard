/**
 * Vercel Serverless Function - AI Food Analysis
 * Uses Claude Vision API to analyze meal photos and estimate nutrition
 */

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

  const { image, description, type } = req.body;

  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'API key not configured',
      message: 'Please add ANTHROPIC_API_KEY to your Vercel environment variables'
    });
  }

  try {
    let content;

    if (type === 'text_estimate') {
      // Text-based food estimation
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
            content: `Estimate the nutritional content of this meal: "${description}".

Return ONLY valid JSON in this exact format (no other text):
{
  "foods": [
    { "name": "food name", "portion": "portion size", "protein": 0, "carbs": 0, "fat": 0, "calories": 0 }
  ],
  "totals": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0 },
  "qualityRating": 3,
  "confidence": 0.8
}

Where qualityRating is 1-5 (1=junk food, 5=whole nutritious foods) and confidence is 0-1.`
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      content = data.content[0].text;
    } else {
      // Image-based analysis
      if (!image) {
        return res.status(400).json({ error: 'No image provided' });
      }

      // Extract base64 data from data URL if needed
      const imageData = image.includes('base64,')
        ? image.split('base64,')[1]
        : image;

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
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageData
                }
              },
              {
                type: 'text',
                text: `Analyze this meal photo. Identify each food item, estimate portions, and calculate approximate macros.

Return ONLY valid JSON in this exact format (no other text):
{
  "foods": [
    { "name": "food name", "portion": "portion size", "protein": 0, "carbs": 0, "fat": 0, "calories": 0 }
  ],
  "totals": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0 },
  "qualityRating": 3,
  "confidence": 0.8
}

Where qualityRating is 1-5 (1=junk food, 5=whole nutritious foods) and confidence is 0-1.
Be conservative with estimates. If unsure, lower the confidence score.`
              }
            ]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      content = data.content[0].text;
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return res.status(200).json(parsed);
    }

    return res.status(500).json({
      error: 'Failed to parse response',
      raw: content
    });

  } catch (error) {
    console.error('Food analysis error:', error);
    return res.status(500).json({
      error: 'Analysis failed',
      message: error.message
    });
  }
}
