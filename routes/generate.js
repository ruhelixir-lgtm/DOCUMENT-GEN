'use strict';
/**
 * POST /api/generate
 * ──────────────────
 * Accepts the full document payload, runs the template engine,
 * packages output as a ZIP and streams it back.
 *
 * Body schema:
 * {
 *   partyId:     string (optional — enables template mode)
 *   selectedDocs: string[] (optional — null = generate all)
 *   lender:      { name, pan, address }
 *   company:     { name, pan, cin, address, phone, email }
 *   directors:   [{ name, pan, aadhaar, mobile, address }]
 *   loan:        { boeAmount, ratePercent, tenureMonths, interestAmount?,
 *                  netDisbursed?, requestDate, disbursementDate,
 *                  boardResDate, rtgsNo, rtgsBank, place }
 *   cheques:     [{ no, date, amount }]
 * }
 */

const express   = require('express');
const path      = require('path');
const fs        = require('fs');
const { generate, zipDirectory } = require('../engine/generator');
const { History }                = require('../data/db');

const router = express.Router();

router.post('/', async (req, res) => {
  const { partyId, selectedDocs, ...D } = req.body;

  // ── Basic validation ─────────────────────────────────────────
  if (!D.loan?.boeAmount)
    return res.status(400).json({ ok: false, error: 'loan.boeAmount is required' });
  if (!D.company?.name)
    return res.status(400).json({ ok: false, error: 'company.name is required' });
  if (!D.directors?.length)
    return res.status(400).json({ ok: false, error: 'At least one director is required' });

  const co      = (D.company.name || 'docs').replace(/[^a-zA-Z0-9]/g,'_').slice(0,30);
  const stamp   = Date.now();
  const outDir  = path.join(__dirname, '..', 'generated', `gen_${stamp}`);
  const zipPath = path.join(__dirname, '..', 'generated', `BoE_${co}_${stamp}.zip`);

  try {
    const files = await generate(D, partyId || null, selectedDocs || null, outDir);

    await zipDirectory(outDir, zipPath);
    fs.rmSync(outDir, { recursive: true, force: true });

    // ── Log to history ─────────────────────────────────────────
    try {
      History.add({
        party_id:    partyId    || null,
        party_name:  D.lender?.name || 'Unknown',
        doc_types:   files.map(f => f.label).join(', '),
        borrower:    D.company?.name || '',
        loan_amount: Number(D.loan?.boeAmount) || 0,
        zip_path:    zipPath,
      });
    } catch (e) {
      console.warn('History save failed (non-fatal):', e.message);
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition',
      `attachment; filename="BoE_${co}.zip"`);

    // Stream the zip, then clean up
    const stream = fs.createReadStream(zipPath);
    stream.pipe(res);
    stream.on('end',   () => { try { fs.unlinkSync(zipPath); } catch (_) {} });
    stream.on('error', err => {
      console.error('Stream error:', err);
      if (!res.headersSent) res.status(500).json({ ok: false, error: 'Stream error' });
    });

  } catch (e) {
    console.error('Generate error:', e);
    // Clean up partial artifacts
    try { fs.rmSync(outDir, { recursive: true, force: true }); } catch (_) {}
    try { if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);  } catch (_) {}

    if (!res.headersSent)
      res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
