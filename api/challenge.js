const { createChallenge } = require('altcha-lib');

module.exports = async function handler(req, res) {
  // Set comprehensive CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Also handle HEAD requests
  if (req.method === 'HEAD') {
    res.status(200).end();
    return;
  }

  // Check if environment variable exists
  if (!process.env.ALTCHA_HMAC_KEY) {
    console.error('ALTCHA_HMAC_KEY environment variable not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Generate challenge
    const challenge = await createChallenge({
      hmacKey: process.env.ALTCHA_HMAC_KEY,
      saltLength: 12,
      number: Math.floor(Math.random() * 100000),
    });

    res.status(200).json(challenge);
  } catch (error) {
    console.error('Challenge creation error:', error);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
};
