// Vercel Serverless Function: Process Apple Health export.zip
const { Octokit } = require('@octokit/rest');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileData, filename } = req.body;

    if (!fileData) {
      return res.status(400).json({ error: 'No file data provided' });
    }

    // Get GitHub token from environment
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return res.status(500).json({ error: 'GitHub token not configured' });
    }

    const octokit = new Octokit({ auth: githubToken });

    // Save to GitHub
    const date = new Date().toISOString().split('T')[0];
    const path = `fitness-data/apple_health_${date}.zip`;

    await octokit.repos.createOrUpdateFileContents({
      owner: 'Dweliw01',
      repo: 'health-dashboard',
      path: path,
      message: `📱 Apple Health export: ${date}`,
      content: fileData, // Already base64
      branch: 'main'
    });

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully! Dashboard will update in ~1 minute.',
      path: path
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Upload failed',
      details: error.message
    });
  }
};
