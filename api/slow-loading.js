export default function handler(req, res) {
  // We must redirect to the backend API because Vercel Hobby limits execution to 10s.
  // The Backend API (running on a VM) will handle the 60s delay and return the HTML.
  const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:3300/api/v1';
  const baseUrl = backendUrl.replace(/\/api\/v1\/?$/, '');
  
  res.redirect(302, `${baseUrl}/slow-loading`);
}
