// Auth check endpoint - verifies if user has valid auth cookie

export default function handler(req, res) {
  // Check for auth cookie
  const cookies = req.headers.cookie || '';
  const hasAuth = cookies.includes('dashboard_auth=authenticated');

  if (hasAuth) {
    return res.status(200).json({ authenticated: true });
  }

  return res.status(401).json({ authenticated: false });
}
