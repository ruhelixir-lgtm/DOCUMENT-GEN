'use strict';
const express = require('express');
const path    = require('path');
const fs      = require('fs');

const app = express();

// ── Middleware ─────────────────────────────────────────────────
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static: public/ (dashboard UI)
app.use(express.static(path.join(__dirname, 'public')));

// Static assets served by path prefix
app.use('/uploads',    express.static(path.join(__dirname, 'uploads')));
app.use('/templates',  express.static(path.join(__dirname, 'templates')));
app.use('/generated',  express.static(path.join(__dirname, 'generated')));

// ── API Routes ──────────────────────────────────────────────────
app.use('/api/parties',   require('./routes/parties'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/history',   require('./routes/history'));
app.use('/api/generate',  require('./routes/generate'));

// ── Health ──────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, version: '3.0.0', mode: 'template-engine', time: new Date().toISOString() });
});

// ── Catch-all — serve SPA ───────────────────────────────────────
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  const dashboard = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(dashboard)) return res.sendFile(dashboard);
  next();
});

// ── Start ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✅  LendDocs v3.0 — Template Engine running at http://localhost:${PORT}`)
);
