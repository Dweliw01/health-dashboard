// Vercel Serverless Function - Returns Claude API key from environment variable
export default function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check multiple possible environment variable names
    const apiKey = process.env.CLAUDE_API_KEY
        || process.env.ANTHROPIC_API_KEY
        || process.env.CLAUDE_KEY
        || process.env.API_KEY;

    if (!apiKey) {
        // Return available env var names for debugging (without values)
        const envVars = Object.keys(process.env).filter(k =>
            k.includes('CLAUDE') || k.includes('ANTHROPIC') || k.includes('API')
        );
        return res.status(500).json({
            error: 'API key not configured',
            hint: 'Set CLAUDE_API_KEY in Vercel Environment Variables',
            availableKeys: envVars
        });
    }

    // Return the API key
    res.status(200).json({ apiKey });
}
