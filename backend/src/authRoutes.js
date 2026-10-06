const express = require('express');
const { verifyCredentials, issueToken } = require('./auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Korisničko ime i lozinka su obavezni.' });
  }
  if (!verifyCredentials(username, password)) {
    return res.status(401).json({ error: 'Pogrešno korisničko ime ili lozinka.' });
  }
  const token = issueToken(username);
  res.json({ token, username });
});

module.exports = router;
