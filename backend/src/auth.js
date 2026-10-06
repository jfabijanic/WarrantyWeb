const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// JWT secret should come from the environment in a real deployment.
// A fixed fallback is used here only so the app keeps working for local/demo use
// without extra setup; tokens remain valid across server restarts either way.
const JWT_SECRET = process.env.JWT_SECRET || 'warrantyplus-dev-secret-change-me';
const TOKEN_EXPIRY = '7d';

// Single hardcoded demo user. Password is stored only as a bcrypt hash.
// Plaintext credentials (for the user to log in with): username "admin", password "WarrantyPlus2026!".
const USER = {
  username: 'admin',
  passwordHash: '$2b$10$0MZJxiyu/E7NZV7KTyTNUuI2uhdv7wnC5L2bx4a3deOUY2kwbD4h2',
};

function verifyCredentials(username, password) {
  if (username !== USER.username) return false;
  return bcrypt.compareSync(password, USER.passwordHash);
}

function issueToken(username) {
  return jwt.sign({ sub: username }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Niste prijavljeni.' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token nije valjan ili je istekao.' });
  }
}

module.exports = { verifyCredentials, issueToken, requireAuth, USER };
