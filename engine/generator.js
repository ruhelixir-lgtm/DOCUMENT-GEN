'use strict';
/**
 * Document Generation Orchestrator
 * ──────────────────────────────────
 * Priority:  TEMPLATE MODE  (uploaded DOCX/XLSX with {{placeholders}})
 * Fallback:  PROGRAMMATIC   (legacy docx-library builders — layout-only,
 *                            used ONLY when no template is uploaded)
 *
 * The programmatic fallback is intentionally kept so the system is always
 * functional even before any templates are uploaded.
 */

const path         = require('path');
const fs           = require('fs');
const archiver     = require('archiver');
const { Packer }   = require('docx');

const { Template, Party } = require('../data/db');
const { buildVars, renderDocx, renderDocxForDirector } = require('./templateEngine');
const { renderXlsx, buildXlsxVars }                    = require('./xlsxEngine');
const programmatic = require('./programmatic');

// ── Ensure interest / net are calculated if not supplied ──────────
function ensureCalc(D) {
  const amt  = Number(D.loan?.boeAmount)    || 0;
  const rate = Number(D.loan?.ratePercent)  || 0;
  const mnth = Number(D.loan?.tenureMonths) || 0;
  if (!D.loan.interestAmount)
    D.loan.interestAmount = Math.round(amt * (rate / 100) * mnth);
  if (!D.loan.netDisbursed)
    D.loan.netDisbursed = amt - D.loan.interestAmount;
}

// ── Write a buffer to disk ────────────────────────────────────────
function write(filePath, buf) {
  fs.writeFileSync(filePath, buf);
}

// ── Generate all documents ────────────────────────────────────────
async function generate(D, partyId, selectedDocs, outDir) {
  ensureCalc(D);
  fs.mkdirSync(outDir, { recursive: true });

  const party = partyId ? Party.get(partyId) : null;
  const vars  = buildVars(D);
  const xvars = buildXlsxVars(D);
  const generated = [];

  // Helper: resolve template for a doc type
  function getTmpl(docType) {
    if (!party) return null;
    const t = Template.getByType(party.id, docType);
    return (t && fs.existsSync(t.file_path)) ? t : null;
  }

  // ── DOCX documents ────────────────────────────────────────────
  const docxJobs = [
    { key: 'request_letter',      num: '1',  label: 'Request_Letter',      prog: () => programmatic.makeRequestLetter(D)      },
    { key: 'authority_letter',    num: '2',  label: 'Authority_Letter',     prog: () => programmatic.makeAuthorityLetter(D)    },
    { key: 'receipt',             num: '3',  label: 'Receipt',              prog: () => programmatic.makeReceipt(D)            },
    { key: 'board_resolution',    num: '5',  label: 'Board_Resolution',     prog: () => programmatic.makeBoardResolution(D)    },
    { key: 'company_undertaking', num: '9',  label: 'Company_Undertaking',  prog: () => programmatic.makeCompanyUndertaking(D) },
  ];

  for (const job of docxJobs) {
    if (selectedDocs && !selectedDocs.includes(job.key)) continue;

    const filename = `${job.num}-${job.label}_${slug(D.company?.name)}.docx`;
    const outFile  = path.join(outDir, filename);
    const tmpl     = getTmpl(job.key);

    if (tmpl) {
      try {
        const buf = renderDocx(tmpl.file_path, vars);
        write(outFile, buf);
        generated.push({ label: job.label, file: outFile, mode: 'template' });
        continue;
      } catch (e) {
        console.warn(`[template] ${job.label} failed, falling back: ${e.message}`);
      }
    }

    // programmatic fallback
    const doc = job.prog();
    const buf = await Packer.toBuffer(doc);
    write(outFile, buf);
    generated.push({ label: job.label, file: outFile, mode: 'programmatic' });
  }

  // ── Personal Undertakings — one per director ──────────────────
  if (!selectedDocs || selectedDocs.includes('personal_undertaking')) {
    const tmpl = getTmpl('personal_undertaking');
    for (let i = 0; i < (D.directors || []).length; i++) {
      const dir      = D.directors[i];
      const num      = 6 + i;
      const filename = `${num}-Conf_Undertaking_${slug(dir.name)}.docx`;
      const outFile  = path.join(outDir, filename);

      if (tmpl) {
        try {
          const buf = renderDocxForDirector(tmpl.file_path, vars, dir);
          write(outFile, buf);
          generated.push({ label: `Conf_Undertaking_${dir.name}`, file: outFile, mode: 'template' });
          continue;
        } catch (e) {
          console.warn(`[template] personal_undertaking ${dir.name} failed, falling back: ${e.message}`);
        }
      }

      const doc = programmatic.makePersonalUndertaking(D, dir);
      const buf = await Packer.toBuffer(doc);
      write(outFile, buf);
      generated.push({ label: `Conf_Undertaking_${dir.name}`, file: outFile, mode: 'programmatic' });
    }
  }

  // ── XLSX: Bill of Exchange ────────────────────────────────────
  if (!selectedDocs || selectedDocs.includes('bill_of_exchange')) {
    const filename = `4-Bill_of_Exchange_${slug(D.company?.name)}.xlsx`;
    const outFile  = path.join(outDir, filename);
    const tmpl     = getTmpl('bill_of_exchange');

    if (tmpl) {
      try {
        const buf = await renderXlsx(tmpl.file_path, xvars);
        write(outFile, buf);
        generated.push({ label: 'Bill_of_Exchange', file: outFile, mode: 'template' });
      } catch (e) {
        console.warn(`[template] BoE xlsx failed, falling back: ${e.message}`);
        await programmatic.makeBillOfExchange(D, outDir, filename);
        generated.push({ label: 'Bill_of_Exchange', file: outFile, mode: 'programmatic' });
      }
    } else {
      await programmatic.makeBillOfExchange(D, outDir, filename);
      generated.push({ label: 'Bill_of_Exchange', file: outFile, mode: 'programmatic' });
    }
  }

  // ── XLSX: Promissory Note ─────────────────────────────────────
  if (!selectedDocs || selectedDocs.includes('promissory_note')) {
    const filename = `10-Promissory_Note_${slug(D.company?.name)}.xlsx`;
    const outFile  = path.join(outDir, filename);
    const tmpl     = getTmpl('promissory_note');

    if (tmpl) {
      try {
        const buf = await renderXlsx(tmpl.file_path, xvars);
        write(outFile, buf);
        generated.push({ label: 'Promissory_Note', file: outFile, mode: 'template' });
      } catch (e) {
        console.warn(`[template] Promissory xlsx failed, falling back: ${e.message}`);
        await programmatic.makePromissoryNote(D, outDir, filename);
        generated.push({ label: 'Promissory_Note', file: outFile, mode: 'programmatic' });
      }
    } else {
      await programmatic.makePromissoryNote(D, outDir, filename);
      generated.push({ label: 'Promissory_Note', file: outFile, mode: 'programmatic' });
    }
  }

  return generated;
}

// ── ZIP a directory into a single zip file ────────────────────────
function zipDirectory(srcDir, destZip) {
  return new Promise((resolve, reject) => {
    const output  = fs.createWriteStream(destZip);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(srcDir, false);
    archive.finalize();
  });
}

// ── Safe filename slug from company name ─────────────────────────
function slug(name) {
  return (name || 'docs').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
}

module.exports = { generate, zipDirectory, buildVars: require('./templateEngine').buildVars };
