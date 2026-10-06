const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('./db');
const { verifyCredentials, issueToken } = require('./auth');

const router = express.Router();

const MIN_PASSWORD_LENGTH = 6;
const USERNAME_RE = /^[A-Za-z0-9_.-]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Korisničko ime i lozinka su obavezni.' });
  }
  const user = await verifyCredentials(username, password);
  if (!user) {
    return res.status(401).json({ error: 'Pogrešno korisničko ime ili lozinka.' });
  }
  res.json({ token: issueToken(user), username: user.username });
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body || {};
  const errors = [];

  if (typeof username !== 'string' || !USERNAME_RE.test(username.trim())) {
    errors.push('Korisničko ime mora imati 3-30 znakova (slova, brojevi, _ . -).');
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    errors.push('Email adresa nije valjana.');
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Lozinka mora imati najmanje ${MIN_PASSWORD_LENGTH} znakova.`);
  }
  if (errors.length) return res.status(400).json({ errors, error: errors[0] });

  const cleanUsername = username.trim();
  const cleanEmail = email.trim();

  const dupUser = await query('SELECT 1 FROM users WHERE lower(username) = lower($1)', [cleanUsername]);
  if (dupUser.rows.length) {
    return res.status(409).json({ error: 'Korisničko ime je već zauzeto.', code: 'username_taken' });
  }
  const dupEmail = await query('SELECT 1 FROM users WHERE lower(email) = lower($1)', [cleanEmail]);
  if (dupEmail.rows.length) {
    return res.status(409).json({ error: 'Račun s tim emailom već postoji.', code: 'email_taken' });
  }

  let created;
  try {
    created = await query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username',
      [cleanUsername, cleanEmail, bcrypt.hashSync(password, 10)],
    );
  } catch (err) {
    // Unique index violation from a concurrent registration.
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Korisničko ime ili email već postoje.', code: 'username_taken' });
    }
    throw err;
  }
  const user = created.rows[0];
  res.status(201).json({ token: issueToken(user), username: user.username });
});

module.exports = router;
