import { createChallenge } from 'altcha-lib';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Your secret HMAC key (store this in Vercel environment variables)
    const hmacKey = process.env.ALTCHA_HMAC_KEY || 'your-secret-key-change-this';
    
    // Create challenge with expiration (10 minutes)
    const expires = Math.floor(Date.now() / 1000) + 600; // 10 minutes from now
    
    const challenge = await createChallenge({
      hmacKey,
      maxnumber: 100000, // Adjust complexity as needed
      saltLength: 12,
      expires, // Challenge expires in 10 minutes
    });

    res.status(200).json(challenge);
  } catch (error) {
    console.error('Challenge creation error:', error);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
}
