/**
 * Vercel Serverless Function - Lifestyle Data Storage
 * Stores lifestyle journal data in Vercel Blob for persistence across devices
 */

import { put, get, list } from '@vercel/blob';

const BLOB_PREFIX = 'lifestyle/';
const DATA_FILE = 'lifestyle-data.json';

// Default data structure
const getDefaultData = () => ({
    version: 1,
    eveningCheckins: [],
    morningReflections: [],
    retroCauses: [],
    patterns: {
        lastAnalyzed: null,
        discovered: []
    },
    streaks: {
        evening: { current: 0, longest: 0 },
        morning: { current: 0, longest: 0 }
    },
    lastSync: null
});

export default async function handler(req, res) {
    // CORS headers for browser requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Check for Blob token
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return res.status(500).json({
            error: 'Storage not configured',
            hint: 'Set BLOB_READ_WRITE_TOKEN in Vercel Environment Variables'
        });
    }

    try {
        if (req.method === 'GET') {
            // Load lifestyle data
            return await loadLifestyleData(res);
        } else if (req.method === 'POST') {
            // Save lifestyle data
            return await saveLifestyleData(req, res);
        } else {
            return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Lifestyle API error:', error);
        return res.status(500).json({ error: error.message });
    }
}

async function loadLifestyleData(res) {
    try {
        // List blobs to find our data file
        const { blobs } = await list({ prefix: BLOB_PREFIX });
        const dataBlob = blobs.find(b => b.pathname === BLOB_PREFIX + DATA_FILE);

        if (!dataBlob) {
            // No data yet, return default structure
            return res.status(200).json({
                data: getDefaultData(),
                isNew: true
            });
        }

        // Fetch the data
        const response = await fetch(dataBlob.url);
        const data = await response.json();

        return res.status(200).json({
            data: data,
            isNew: false,
            lastModified: dataBlob.uploadedAt
        });
    } catch (error) {
        console.error('Load error:', error);
        // Return default data on error
        return res.status(200).json({
            data: getDefaultData(),
            isNew: true,
            error: error.message
        });
    }
}

async function saveLifestyleData(req, res) {
    const { data, merge = true } = req.body;

    if (!data) {
        return res.status(400).json({ error: 'No data provided' });
    }

    try {
        let finalData = data;

        if (merge) {
            // Load existing data and merge
            const { blobs } = await list({ prefix: BLOB_PREFIX });
            const dataBlob = blobs.find(b => b.pathname === BLOB_PREFIX + DATA_FILE);

            if (dataBlob) {
                const response = await fetch(dataBlob.url);
                const existingData = await response.json();
                finalData = mergeLifestyleData(existingData, data);
            }
        }

        // Add sync timestamp
        finalData.lastSync = new Date().toISOString();

        // Save to Vercel Blob
        const blob = await put(BLOB_PREFIX + DATA_FILE, JSON.stringify(finalData, null, 2), {
            access: 'public',
            contentType: 'application/json'
        });

        return res.status(200).json({
            success: true,
            url: blob.url,
            savedAt: finalData.lastSync
        });
    } catch (error) {
        console.error('Save error:', error);
        return res.status(500).json({ error: error.message });
    }
}

/**
 * Merge incoming data with existing data (smart merge)
 */
function mergeLifestyleData(existing, incoming) {
    const merged = { ...existing };

    // Merge evening check-ins (by date, prefer newer)
    if (incoming.eveningCheckins) {
        const checkinMap = new Map();
        existing.eveningCheckins?.forEach(c => checkinMap.set(c.date, c));
        incoming.eveningCheckins.forEach(c => checkinMap.set(c.date, c));
        merged.eveningCheckins = Array.from(checkinMap.values())
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // Merge morning reflections (by date, prefer newer)
    if (incoming.morningReflections) {
        const reflectionMap = new Map();
        existing.morningReflections?.forEach(r => reflectionMap.set(r.date, r));
        incoming.morningReflections.forEach(r => reflectionMap.set(r.date, r));
        merged.morningReflections = Array.from(reflectionMap.values())
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // Merge retro causes (by date+metric, prefer newer)
    if (incoming.retroCauses) {
        const causeMap = new Map();
        existing.retroCauses?.forEach(c => causeMap.set(`${c.date}_${c.metric}`, c));
        incoming.retroCauses.forEach(c => causeMap.set(`${c.date}_${c.metric}`, c));
        merged.retroCauses = Array.from(causeMap.values())
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // Use incoming patterns if provided (they're recalculated locally anyway)
    if (incoming.patterns) {
        merged.patterns = incoming.patterns;
    }

    // Recalculate streaks from merged data
    merged.streaks = incoming.streaks || existing.streaks;

    // Keep version
    merged.version = Math.max(existing.version || 1, incoming.version || 1);

    return merged;
}
