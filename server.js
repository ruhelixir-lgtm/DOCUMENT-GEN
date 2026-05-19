'use strict';
const express = require('express');
const path    = require('path');
const fs      = require('fs');

const app = express();

// ── Middleware ────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files: public/ (new UI) takes priority, then root
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Serve uploaded assets
app.use('/uploads',       express.static(path.join(__dirname, 'uploads')));
app.use('/templates',     express.static(path.join(__dirname, 'templates')));
app.use('/generated-docs',express.static(path.join(__dirname, 'generated-docs')));

// ── API Routes ────────────────────────────────────────────────
app.use('/api/parties',   require('./routes/parties'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/history',   require('./routes/history'));

// ── NEW: Enterprise generate endpoint ─────────────────────────
const { generate, zipDirectory } = require('./engine/generator');
const { History } = require('./data/db');

app.post('/api/generate', async (req, res) => {
  try {
    const { partyId, selectedDocs, ...D } = req.body;

    if (!D.loan?.boeAmount)
      return res.status(400).json({ ok: false, error: 'loan.boeAmount is required' });

    const outDir  = path.join(__dirname, 'generated-docs', 'gen_' + Date.now());
    const zipPath = outDir + '.zip';

    const files = await generate(D, partyId, selectedDocs || null, outDir);
    await zipDirectory(outDir, zipPath);
    fs.rmSync(outDir, { recursive: true, force: true });

    // Save to history
    History.add({
      party_id:    partyId || null,
      party_name:  D.lender?.name || 'Unknown',
      doc_types:   files.map(f => f.label).join(', '),
      borrower:    D.company?.name || '',
      loan_amount: D.loan?.boeAmount || 0,
      zip_path:    zipPath
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition',
      `attachment; filename="BoE_${(D.company?.name||'docs').split(' ').slice(0,3).join('_')}.zip"`);
    res.sendFile(zipPath, err => {
      if (err) console.error('Send error:', err);
    });
  } catch (e) {
    console.error('Generate error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── LEGACY generate endpoint (backward compat) ─────────────────
const archiver = require('archiver');
const { Packer } = require('docx');
const prog = require('./engine/programmatic');

app.post('/generate', async (req, res) => {
  try {
    const D = req.body;
    if (!D.loan.interestAmount)
      D.loan.interestAmount = Math.round(D.loan.boeAmount*(D.loan.ratePercent/100)*D.loan.tenureMonths);
    if (!D.loan.netDisbursed)
      D.loan.netDisbursed = D.loan.boeAmount - D.loan.interestAmount;

    const outDir = path.join('/tmp', 'boe_' + Date.now());
    fs.mkdirSync(outDir, { recursive: true });

    const docxList = [
      { name: '1-Request_Letter',      doc: prog.makeRequestLetter(D) },
      { name: '2-Authority_Letter',    doc: prog.makeAuthorityLetter(D) },
      { name: '3-Receipt',             doc: prog.makeReceipt(D) },
      { name: '5-Board_Resolution',    doc: prog.makeBoardResolution(D) },
      { name: '9-Company_Undertaking', doc: prog.makeCompanyUndertaking(D) },
      ...D.directors.map((dir, i) => ({
        name: `${6+i}-Conf_Undertaking_${dir.name.replace(/ /g,'_')}`,
        doc:  prog.makePersonalUndertaking(D, dir)
      })),
    ];
    for (const { name, doc } of docxList) {
      const buf = await Packer.toBuffer(doc);
      fs.writeFileSync(path.join(outDir, name + '.docx'), buf);
    }
    await prog.makeBillOfExchange(D, outDir);
    await prog.makePromissoryNote(D, outDir);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition',
      `attachment; filename="BoE_${D.company.name.split(' ').slice(0,3).join('_')}.zip"`);
    const arc = archiver('zip');
    arc.pipe(res);
    arc.directory(outDir, false);
    arc.finalize();
    arc.on('end', () => { try { fs.rmSync(outDir, { recursive: true }); } catch (_) {} });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, version: '2.0.0', time: new Date().toISOString() });
});

// ── Serve new dashboard for all non-API routes ────────────────
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  const dashboard = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(dashboard)) return res.sendFile(dashboard);
  next();
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✅  Lending Doc System v2.0 running at http://localhost:${PORT}`)
);
