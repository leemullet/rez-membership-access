// api/test.js - Create this file to test basic functionality
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Return basic info
  res.status(200).json({
    message: 'Vercel function is working!',
    method: req.method,
    timestamp: new Date().toISOString(),
    hasHmacKey: !!process.env.ALTCHA_HMAC_KEY,
    nodeVersion: process.version,
    headers: req.headers
  });
}
