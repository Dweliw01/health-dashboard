// Authentication endpoint - verifies password and sets auth cookie

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body;

  // Get password from environment variable
  const correctPassword = process.env.DASHBOARD_PASSWORD;

  if (!correctPassword) {
    console.error('DASHBOARD_PASSWORD not configured');
    return res.status(500).json({ error: 'Authentication not configured' });
  }

  // Verify password
  if (password === correctPassword) {
    // Set auth cookie (HttpOnly for security, 30 days expiry)
    const cookieOptions = [
      'dashboard_auth=authenticated',
      'Path=/',
      'HttpOnly',
      'Secure',
      'SameSite=Strict',
      `Max-Age=${60 * 60 * 24 * 30}` // 30 days
    ].join('; ');

    res.setHeader('Set-Cookie', cookieOptions);
    return res.status(200).json({ success: true });
  }

  // Invalid password
  return res.status(401).json({ success: false, error: 'Invalid password' });
}
