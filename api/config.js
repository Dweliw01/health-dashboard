// Vercel Serverless Function - Check if API key is configured (never expose the key!)
export default function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const hasKey = !!(process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY);

    // Only return whether key exists, NEVER the actual key
    res.status(200).json({
        configured: hasKey,
        message: hasKey ? 'API key is configured' : 'API key not configured'
    });
}
