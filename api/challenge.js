const { createChallenge } = require('altcha-lib');

module.exports = async function handler(req, res) {
  // Set CORS headers FIRST - before any other logic
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
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
      number: Math.floor(Math.random() * 100000), // Adjust difficulty
    });

    res.status(200).json(challenge);
  } catch (error) {
    console.error('Challenge creation error:', error);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
};
