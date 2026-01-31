import { put, list } from '@vercel/blob';

const BLOB_PREFIX = 'nutrition/';
const DATA_FILE = 'nutrition-data.json';

const getDefaultData = () => ({
    version: 1,
    goals: { waterGlasses: 8, proteinGrams: 150, useSimpleProtein: true },
    entries: [],
    stats: {},
    lastSync: null
});

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return res.status(500).json({ error: 'Storage not configured' });
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
            return res.status(200).json({ data, isNew: false });

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
                    const existing = await response.json();
                    finalData = mergeData(existing, data);
                }
            }

            finalData.lastSync = new Date().toISOString();

            await put(BLOB_PREFIX + DATA_FILE, JSON.stringify(finalData), {
                access: 'public',
                contentType: 'application/json'
            });

            return res.status(200).json({ success: true, savedAt: finalData.lastSync });

        } else {
            return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Nutrition API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}

function mergeData(existing, incoming) {
    const merged = { ...existing };

    // Merge entries by date
    if (incoming.entries) {
        const map = new Map();
        (existing.entries || []).forEach(e => map.set(e.date, e));
        incoming.entries.forEach(e => map.set(e.date, e));
        merged.entries = Array.from(map.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // Use latest goals
    if (incoming.goals) {
        merged.goals = incoming.goals;
    }

    merged.version = Math.max(existing.version || 1, incoming.version || 1);

    return merged;
}
