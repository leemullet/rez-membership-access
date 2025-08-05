import { verifySolution } from 'altcha-lib';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { altcha } = req.body;
    
    if (!altcha) {
      return res.status(400).json({ error: 'Missing altcha payload' });
    }

    // Your secret HMAC key (same as in challenge.js)
    const hmacKey = process.env.ALTCHA_HMAC_KEY || 'your-secret-key-change-this';
    
    // Verify the solution
    const isValid = await verifySolution(altcha, hmacKey, {
      verifyExpiration: true, // Check if challenge has expired
    });

    if (isValid) {
      res.status(200).json({ verified: true });
    } else {
      res.status(400).json({ verified: false, error: 'Invalid solution' });
    }
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ verified: false, error: 'Verification failed' });
  }
}
