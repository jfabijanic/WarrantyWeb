const express = require('express');
const cors = require('cors');
const { router: devicesRouter } = require('./devices');
const authRoutes = require('./authRoutes');
const { requireAuth } = require('./auth');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/devices', requireAuth, devicesRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`WarrantyPlus backend listening on http://localhost:${PORT}`);
});
