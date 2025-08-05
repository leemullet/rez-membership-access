const { createChallenge } = require('altcha-lib');

module.exports = async function handler(req, res) {
  // Set CORS headers - allow all origins for client flexibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
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
