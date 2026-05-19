'use strict';
const express = require('express');
const path    = require('path');
const fs      = require('fs');
const { History } = require('../data/db');

const router = express.Router();

// GET /api/history
router.get('/', (_req, res) => {
  const rows = History.all(100);
  res.json({ ok: true, history: rows });
});

// GET /api/history/recent
router.get('/recent', (_req, res) => {
  const rows = History.recent(10);
  res.json({ ok: true, history: rows });
});

// GET /api/history/:id/download
router.get('/:id/download', (req, res) => {
  const rows = History.all(1000);
  const row  = rows.find(r => r.id === req.params.id);
  if (!row) return res.status(404).json({ ok: false, error: 'Not found' });
  if (!row.zip_path || !fs.existsSync(row.zip_path))
    return res.status(410).json({ ok: false, error: 'File no longer available' });
  res.download(row.zip_path);
});

module.exports = router;
