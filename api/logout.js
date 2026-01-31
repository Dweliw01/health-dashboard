// Logout endpoint - clears auth cookie

export default function handler(req, res) {
  // Clear the auth cookie
  res.setHeader('Set-Cookie', 'dashboard_auth=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict');

  // Redirect to home (will show login)
  res.writeHead(302, { Location: '/' });
  res.end();
}
