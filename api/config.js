// Vercel Serverless Function - Returns Claude API key from environment variable
export default function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.CLAUDE_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    // Return the API key
    res.status(200).json({ apiKey });
}
