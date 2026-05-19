'use strict';
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { Party } = require('../data/db');

const router = express.Router();
const BASE   = path.join(__dirname, '..', 'uploads');

// ── Multer per asset type ─────────────────────────────────────
function storage(subdir) {
  return multer.diskStorage({
    destination: (req, _file, cb) => {
      const dir = path.join(BASE, subdir);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext  = path.extname(file.originalname).toLowerCase();
      const name = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
      cb(null, name);
    }
  });
}

const uploadLogo        = multer({ storage: storage('logos'),        limits: { fileSize: 5*1024*1024 } });
const uploadLetterhead  = multer({ storage: storage('letterheads'),  limits: { fileSize: 20*1024*1024 } });
const uploadFooter      = multer({ storage: storage('footers'),      limits: { fileSize: 10*1024*1024 } });
const uploadSignature   = multer({ storage: storage('signatures'),   limits: { fileSize: 5*1024*1024 } });
const uploadStamp       = multer({ storage: storage('stamps'),       limits: { fileSize: 5*1024*1024 } });

function relPath(absPath) {
  if (!absPath) return null;
  return '/' + path.relative(path.join(__dirname, '..'), absPath).replace(/\\/g, '/');
}

// ── GET /api/parties ──────────────────────────────────────────
router.get('/', (_req, res) => {
  const parties = Party.all().map(p => ({ ...p, logo_path: relPath(p.logo_path), letterhead_path: relPath(p.letterhead_path), footer_path: relPath(p.footer_path), signature_path: relPath(p.signature_path), stamp_path: relPath(p.stamp_path) }));
  res.json({ ok: true, parties });
});

// ── GET /api/parties/active ───────────────────────────────────
router.get('/active', (_req, res) => {
  const parties = Party.active().map(p => ({ id: p.id, name: p.name, short_code: p.short_code, pan: p.pan, logo_path: relPath(p.logo_path) }));
  res.json({ ok: true, parties });
});

// ── GET /api/parties/:id ──────────────────────────────────────
router.get('/:id', (req, res) => {
  const p = Party.get(req.params.id);
  if (!p) return res.status(404).json({ ok: false, error: 'Party not found' });
  res.json({ ok: true, party: { ...p, logo_path: relPath(p.logo_path), letterhead_path: relPath(p.letterhead_path), footer_path: relPath(p.footer_path), signature_path: relPath(p.signature_path), stamp_path: relPath(p.stamp_path) } });
});

// ── POST /api/parties ─────────────────────────────────────────
router.post('/', (req, res) => {
  const { name, short_code, address, city, state, pincode, phone, email, pan, gst } = req.body;
  if (!name || !short_code) return res.status(400).json({ ok: false, error: 'name and short_code required' });
  try {
    const id = Party.create({ name, short_code: short_code.toUpperCase(), address, city, state, pincode, phone, email, pan, gst });
    res.json({ ok: true, id });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// ── PUT /api/parties/:id ──────────────────────────────────────
router.put('/:id', (req, res) => {
  const p = Party.get(req.params.id);
  if (!p) return res.status(404).json({ ok: false, error: 'Party not found' });
  const allowed = ['name','short_code','address','city','state','pincode','phone','email','pan','gst','active'];
  const data = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) data[k] = req.body[k]; });
  Party.update(req.params.id, data);
  res.json({ ok: true });
});

// ── DELETE /api/parties/:id ───────────────────────────────────
router.delete('/:id', (req, res) => {
  Party.delete(req.params.id);
  res.json({ ok: true });
});

// ── ASSET UPLOAD helpers ──────────────────────────────────────
function assetRoute(uploadMiddleware, field, dbField) {
  return [
    uploadMiddleware.single(field),
    (req, res) => {
      const p = Party.get(req.params.id);
      if (!p) return res.status(404).json({ ok: false, error: 'Party not found' });
      if (!req.file) return res.status(400).json({ ok: false, error: 'No file uploaded' });
      // Remove old file
      if (p[dbField]) try { fs.unlinkSync(p[dbField]); } catch (_) {}
      Party.updateAsset(req.params.id, dbField, req.file.path);
      res.json({ ok: true, path: relPath(req.file.path) });
    }
  ];
}

// ── POST /api/parties/:id/logo ────────────────────────────────
router.post('/:id/logo',        ...assetRoute(uploadLogo,       'logo',        'logo_path'));
router.post('/:id/letterhead',  ...assetRoute(uploadLetterhead, 'letterhead',  'letterhead_path'));
router.post('/:id/footer',      ...assetRoute(uploadFooter,     'footer',      'footer_path'));
router.post('/:id/signature',   ...assetRoute(uploadSignature,  'signature',   'signature_path'));
router.post('/:id/stamp',       ...assetRoute(uploadStamp,      'stamp',       'stamp_path'));

module.exports = router;
