// api/challenge.js - Enhanced CORS version
export default async function handler(req, res) {
  // Set comprehensive CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { createChallenge } = await import('altcha-lib');
    
    const hmacKey = process.env.ALTCHA_HMAC_KEY;
    
    if (!hmacKey) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const challenge = await createChallenge({
      hmacKey: hmacKey,
      maxnumber: 50000,
      saltLength: 10
    });

    return res.status(200).json(challenge);
    
  } catch (error) {
    console.error('Challenge creation failed:', error);
    return res.status(500).json({ 
      error: 'Failed to create challenge',
      message: error.message
    });
  }
}
