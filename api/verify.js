// api/verify.js  
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

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Import altcha-lib dynamically
    const { verifySolution } = await import('altcha-lib');
    
    const { altcha } = req.body;
    
    if (!altcha) {
      return res.status(400).json({ error: 'Missing altcha payload' });
    }

    // Use same HMAC key as challenge endpoint
    const hmacKey = process.env.ALTCHA_HMAC_KEY || 'fallback-key-change-in-production';
    
    console.log('Verifying solution with HMAC key:', hmacKey ? 'Key present' : 'No key');
    
    // Verify the solution
    const isValid = await verifySolution(altcha, hmacKey);

    console.log('Verification result:', isValid);

    res.status(200).json({ 
      verified: isValid,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ 
      verified: false, 
      error: 'Verification failed',
      details: error.message 
    });
  }
}
