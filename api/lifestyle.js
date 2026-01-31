// Minimal version - no external imports
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Step 1: Check if we even get here
    const step1 = 'Handler running';

    // Step 2: Check env var
    const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;

    // Step 3: Try dynamic import
    let blobLoaded = false;
    let blobError = null;
    try {
        const blob = await import('@vercel/blob');
        blobLoaded = true;
    } catch (e) {
        blobError = e.message;
    }

    return res.status(200).json({
        step1,
        hasToken,
        blobLoaded,
        blobError,
        nodeVersion: process.version
    });
}
