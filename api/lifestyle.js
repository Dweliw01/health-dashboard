const { put, list } = require('@vercel/blob');

const BLOB_PREFIX = 'lifestyle/';
const DATA_FILE = 'lifestyle-data.json';

const getDefaultData = () => ({
    version: 1,
    eveningCheckins: [],
    morningReflections: [],
    retroCauses: [],
    patterns: { lastAnalyzed: null, discovered: [] },
    streaks: {
        evening: { current: 0, longest: 0 },
        morning: { current: 0, longest: 0 }
    },
    lastSync: null
});

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return res.status(500).json({
            error: 'Storage not configured',
            hint: 'Set BLOB_READ_WRITE_TOKEN in Vercel Environment Variables'
        });
    }

    try {
        if (req.method === 'GET') {
            const { blobs } = await list({ prefix: BLOB_PREFIX });
            const dataBlob = blobs.find(b => b.pathname === BLOB_PREFIX + DATA_FILE);

            if (!dataBlob) {
                return res.status(200).json({ data: getDefaultData(), isNew: true });
            }

            const response = await fetch(dataBlob.url);
            const data = await response.json();
            return res.status(200).json({ data, isNew: false, lastModified: dataBlob.uploadedAt });

        } else if (req.method === 'POST') {
            const { data, merge = true } = req.body;

            if (!data) {
                return res.status(400).json({ error: 'No data provided' });
            }

            let finalData = data;

            if (merge) {
                const { blobs } = await list({ prefix: BLOB_PREFIX });
                const dataBlob = blobs.find(b => b.pathname === BLOB_PREFIX + DATA_FILE);

                if (dataBlob) {
                    const response = await fetch(dataBlob.url);
                    const existingData = await response.json();
                    finalData = mergeData(existingData, data);
                }
            }

            finalData.lastSync = new Date().toISOString();

            const blob = await put(BLOB_PREFIX + DATA_FILE, JSON.stringify(finalData, null, 2), {
                access: 'public',
                contentType: 'application/json'
            });

            return res.status(200).json({ success: true, url: blob.url, savedAt: finalData.lastSync });

        } else {
            return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
};

function mergeData(existing, incoming) {
    const merged = { ...existing };

    if (incoming.eveningCheckins) {
        const map = new Map();
        (existing.eveningCheckins || []).forEach(c => map.set(c.date, c));
        incoming.eveningCheckins.forEach(c => map.set(c.date, c));
        merged.eveningCheckins = Array.from(map.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    if (incoming.morningReflections) {
        const map = new Map();
        (existing.morningReflections || []).forEach(r => map.set(r.date, r));
        incoming.morningReflections.forEach(r => map.set(r.date, r));
        merged.morningReflections = Array.from(map.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    if (incoming.retroCauses) {
        const map = new Map();
        (existing.retroCauses || []).forEach(c => map.set(`${c.date}_${c.metric}`, c));
        incoming.retroCauses.forEach(c => map.set(`${c.date}_${c.metric}`, c));
        merged.retroCauses = Array.from(map.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    if (incoming.patterns) merged.patterns = incoming.patterns;
    merged.streaks = incoming.streaks || existing.streaks;
    merged.version = Math.max(existing.version || 1, incoming.version || 1);

    return merged;
}
