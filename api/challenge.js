// api/challenge.js
export default async function handler(req, res) {
  // Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Import altcha-lib dynamically to avoid any module issues
    const { createChallenge } = await import('altcha-lib');
    
    // Use environment variable or fallback
    const hmacKey = process.env.ALTCHA_HMAC_KEY || 'fallback-key-change-in-production';
    
    console.log('Creating challenge with HMAC key:', hmacKey ? 'Key present' : 'No key');
    
    // Create challenge
    const challenge = await createChallenge({
      hmacKey,
      maxnumber: 50000, // Reduced complexity for testing
      saltLength: 12,
    });

    console.log('Challenge created successfully:', challenge);
    
    // Return the challenge
    res.status(200).json(challenge);
    
  } catch (error) {
    console.error('Challenge creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create challenge',
      details: error.message 
    });
  }
}
