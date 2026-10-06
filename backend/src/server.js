const express = require('express');
const cors = require('cors');
const { router: devicesRouter } = require('./devices');
const authRoutes = require('./authRoutes');
const { requireAuth } = require('./auth');
const { ensureReady, hasConnectionString } = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Diagnostics: reports whether the database is configured and reachable (no secrets are returned).
app.get('/api/health/db', async (req, res) => {
  const info = {
    configured: hasConnectionString(),
    jwtSecretSet: !!process.env.JWT_SECRET,
    vercelEnv: process.env.VERCEL_ENV || null,
    // Names only, never values.
    envNames: Object.keys(process.env).filter((k) => /^(DATABASE|POSTGRES|PG|NEON|JWT|ADMIN)/.test(k)).sort(),
  };
  try {
    await ensureReady();
    res.json({ ...info, ok: true });
  } catch (err) {
    res.status(500).json({ ...info, ok: false, error: err.message, code: err.code });
  }
});

// Creates tables and the default admin on first use (also on every serverless cold start).
app.use('/api', async (req, res, next) => {
  try {
    await ensureReady();
    next();
  } catch (err) {
    next(err);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/devices', requireAuth, devicesRouter);

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Neispravan JSON.' });
  res.status(500).json({ error: 'Greška na serveru.' });
});

// Vercel imports the exported app; locally we listen on a port.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`WarrantyPlus backend listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
