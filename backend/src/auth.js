const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('./db');

// Set JWT_SECRET in the environment for any real deployment; the fallback is for local dev only.
const JWT_SECRET = process.env.JWT_SECRET || 'warrantyplus-dev-secret-change-me';
const TOKEN_EXPIRY = '7d';

if (process.env.VERCEL && !process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET is not set; using the insecure default secret.');
}

async function verifyCredentials(username, password) {
  const { rows } = await query('SELECT * FROM users WHERE lower(username) = lower($1)', [username]);
  const user = rows[0];
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return null;
  return user;
}

function issueToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Niste prijavljeni.' });
  }
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token nije valjan ili je istekao.' });
  }
  const { rows } = await query('SELECT id, username FROM users WHERE id = $1', [Number(payload.sub) || 0]);
  if (!rows[0]) return res.status(401).json({ error: 'Token nije valjan ili je istekao.' });
  req.user = rows[0];
  next();
}

module.exports = { verifyCredentials, issueToken, requireAuth };
