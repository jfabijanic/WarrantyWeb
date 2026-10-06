const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');

// JWT secret should come from the environment in a real deployment.
// A fixed fallback is used here only so the app keeps working for local/demo use
// without extra setup; tokens remain valid across server restarts either way.
const JWT_SECRET = process.env.JWT_SECRET || 'warrantyplus-dev-secret-change-me';
const TOKEN_EXPIRY = '7d';

function verifyCredentials(username, password) {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return null;
  return user;
}

function issueToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Niste prijavljeni.' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Tokens issued before multi-user support carried the username as `sub`.
    const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(payload.sub);
    if (!user) return res.status(401).json({ error: 'Token nije valjan ili je istekao.' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Token nije valjan ili je istekao.' });
  }
}

module.exports = { verifyCredentials, issueToken, requireAuth };
