'use strict';
/**
 * Document Generation Engine
 * ---------------------------
 * Two modes:
 *   1. TEMPLATE mode  – docxtemplater fills {{placeholders}} in user-uploaded DOCX
 *   2. PROGRAMMATIC   – original docx-library builders (always available as fallback)
 */

const path         = require('path');
const fs           = require('fs');
const Docxtemplater = require('docxtemplater');
const PizZip       = require('pizzip');
const archiver     = require('archiver');
const ExcelJS      = require('exceljs');

const { Template, Party, History } = require('../data/db');

// ── Import original programmatic builders ─────────────────────
const programmatic = require('./programmatic');

// ── Variable map builder ──────────────────────────────────────
function buildVars(D) {
  const fmt  = n => `RS. ${Number(n).toLocaleString('en-IN')}/-`;
  const dirs = D.directors || [];

  return {
    // Lender
    LENDER_NAME:    D.lender?.name    || '',
    LENDER_PAN:     D.lender?.pan     || '',
    LENDER_ADDRESS: (D.lender?.address || []).join(', '),

    // Company
    COMPANY_NAME:    D.company?.name    || '',
    COMPANY_PAN:     D.company?.pan     || '',
    COMPANY_ADDRESS: (D.company?.address || []).join(', '),

    // Borrower (first director)
    BORROWER_NAME:    dirs[0]?.name    || '',
    DIRECTOR_NAME:    dirs[0]?.name    || '',
    DIRECTOR_AADHAAR: dirs[0]?.aadhaar || '',
    DIRECTOR_PAN:     dirs[0]?.pan     || '',
    DIRECTOR_MOBILE:  dirs[0]?.mobile  || '',
    DIRECTOR_ADDRESS: (dirs[0]?.address || []).join(', '),
    ALL_DIRECTORS:    dirs.map(d => d.name).join(', '),
    DIRECTOR_SIGS:    dirs.map(d => `(${d.name})`).join('     '),

    // Loan
    LOAN_AMOUNT:          String(D.loan?.boeAmount     || 0),
    LOAN_AMOUNT_FMT:      fmt(D.loan?.boeAmount        || 0),
    LOAN_AMOUNT_WORDS:    programmatic.toWords(D.loan?.boeAmount || 0),
    INTEREST_AMOUNT:      String(D.loan?.interestAmount || 0),
    INTEREST_AMOUNT_FMT:  fmt(D.loan?.interestAmount   || 0),
    INTEREST_AMOUNT_WORDS:programmatic.toWords(D.loan?.interestAmount || 0),
    NET_DISBURSED:        String(D.loan?.netDisbursed   || 0),
    NET_DISBURSED_FMT:    fmt(D.loan?.netDisbursed      || 0),
    NET_DISBURSED_WORDS:  programmatic.toWords(D.loan?.netDisbursed || 0),
    RATE_PERCENT:         String((D.loan?.ratePercent || 0).toFixed(2)),
    TENURE_MONTHS:        String(D.loan?.tenureMonths  || 0),

    // Dates
    REQUEST_DATE:      D.loan?.requestDate      || '',
    DISBURSEMENT_DATE: D.loan?.disbursementDate || '',
    BOARD_RES_DATE:    D.loan?.boardResDate     || '',
    BOARD_DATE:        D.loan?.boardResDate     || '',

    // Payment
    RTGS_NO:   D.loan?.rtgsNo   || '',
    RTGS_BANK: D.loan?.rtgsBank || '',
    PLACE:     D.loan?.place    || 'Mumbai',

    // Cheque table (plain text summary)
    CHEQUE_TABLE: (D.cheques || []).filter(c => c.no)
      .map((c, i) => `${i+1}. Cheque No: ${c.no}  Date: ${c.date}  Amount: ${c.amount}`)
      .join('\n') || '(no cheques entered)',
  };
}

// ── Render one DOCX template ──────────────────────────────────
function renderTemplate(templatePath, vars) {
  const content = fs.readFileSync(templatePath, 'binary');
  const zip     = new PizZip(content);
  const doc     = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks:    true,
    delimiters:    { start: '{{', end: '}}' },
    errorLogging:  false,
  });
  doc.render(vars);
  return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

// ── Main generate function ────────────────────────────────────
async function generate(D, partyId, selectedDocs, outDir) {
  const party = partyId ? Party.get(partyId) : null;
  fs.mkdirSync(outDir, { recursive: true });

  const generated = [];

  // auto-calc if missing
  if (!D.loan.interestAmount)
    D.loan.interestAmount = Math.round(D.loan.boeAmount * (D.loan.ratePercent / 100) * D.loan.tenureMonths);
  if (!D.loan.netDisbursed)
    D.loan.netDisbursed = D.loan.boeAmount - D.loan.interestAmount;

  const vars = buildVars(D);

  // Doc type → programmatic builder map
  const progBuilders = {
    request_letter:      () => programmatic.makeRequestLetter(D),
    authority_letter:    () => programmatic.makeAuthorityLetter(D),
    receipt:             () => programmatic.makeReceipt(D),
    board_resolution:    () => programmatic.makeBoardResolution(D),
    company_undertaking: () => programmatic.makeCompanyUndertaking(D),
  };

  // Personal undertakings (one per director)
  const dirUndertakings = (D.directors || []).map((dir, i) => ({
    key: `personal_undertaking_${i}`,
    label: `${6 + i}-Conf_Undertaking_${dir.name.replace(/ /g, '_')}`,
    builder: () => programmatic.makePersonalUndertaking(D, dir)
  }));

  // Decide which DOCX docs to generate
  const docxDocs = [
    { key: 'request_letter',      label: '1-Request_Letter' },
    { key: 'authority_letter',    label: '2-Authority_Letter' },
    { key: 'receipt',             label: '3-Receipt' },
    { key: 'board_resolution',    label: '5-Board_Resolution' },
    { key: 'company_undertaking', label: '9-Company_Undertaking' },
    ...dirUndertakings,
  ].filter(d => !selectedDocs || selectedDocs.includes(d.key) || d.key.startsWith('personal_undertaking'));

  const { Packer } = require('docx');

  for (const item of docxDocs) {
    const baseKey = item.key.startsWith('personal_undertaking') ? 'personal_undertaking' : item.key;
    const tmpl    = party ? Template.getByType(party.id, baseKey) : null;
    const outFile = path.join(outDir, item.label + '.docx');

    if (tmpl && fs.existsSync(tmpl.file_path)) {
      // ── TEMPLATE MODE ─────────────────────────────────────
      // For per-director undertakings, override director vars
      let docVars = { ...vars };
      if (item.key.startsWith('personal_undertaking_')) {
        const idx = parseInt(item.key.split('_').pop());
        const dir = D.directors[idx];
        if (dir) {
          docVars.DIRECTOR_NAME    = dir.name;
          docVars.DIRECTOR_AADHAAR = dir.aadhaar;
          docVars.DIRECTOR_PAN     = dir.pan;
          docVars.DIRECTOR_MOBILE  = dir.mobile;
          docVars.DIRECTOR_ADDRESS = (dir.address || []).join(', ');
          docVars.BORROWER_NAME    = dir.name;
        }
      }
      try {
        const buf = renderTemplate(tmpl.file_path, docVars);
        fs.writeFileSync(outFile, buf);
        generated.push({ label: item.label, file: outFile, mode: 'template' });
        continue;
      } catch (e) {
        console.warn(`Template render failed for ${item.label}, falling back to programmatic:`, e.message);
      }
    }

    // ── PROGRAMMATIC MODE (fallback / default) ────────────
    const builder = progBuilders[baseKey] || item.builder;
    if (builder) {
      const doc = builder();
      const buf = await Packer.toBuffer(doc);
      fs.writeFileSync(outFile, buf);
      generated.push({ label: item.label, file: outFile, mode: 'programmatic' });
    }
  }

  // ── XLSX docs ─────────────────────────────────────────────
  if (!selectedDocs || selectedDocs.includes('bill_of_exchange')) {
    await programmatic.makeBillOfExchange(D, outDir);
    generated.push({ label: '4-Bill_of_Exchange', file: path.join(outDir, '4-Bill_of_Exchange.xlsx'), mode: 'programmatic' });
  }
  if (!selectedDocs || selectedDocs.includes('promissory_note')) {
    await programmatic.makePromissoryNote(D, outDir);
    generated.push({ label: '10-Promissory_Note', file: path.join(outDir, '10-Promissory_Note.xlsx'), mode: 'programmatic' });
  }

  return generated;
}

// ── ZIP helper ────────────────────────────────────────────────
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

module.exports = { generate, zipDirectory, buildVars };
