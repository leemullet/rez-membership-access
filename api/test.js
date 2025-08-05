module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Return a mock challenge that matches ALTCHA format
  res.status(200).json({
    algorithm: "SHA-256",
    challenge: "test-challenge-string",
    maxnumber: 100000,
    salt: "test-salt-123",
    signature: "test-signature-456"
  });
};
