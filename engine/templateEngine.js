'use strict';
/**
 * Template Engine
 * ───────────────
 * Fills {{PLACEHOLDERS}} in uploaded DOCX templates using docxtemplater.
 * Supports:
 *   • Simple scalar replacements  {{COMPANY_NAME}}
 *   • Multi-line text with \n     {{COMPANY_ADDRESS}}
 *   • Director loops              {#directors}...{/directors}
 *   • Cheque row loops            {#cheques}...{/cheques}
 *
 * NEVER modifies document layout, fonts, margins, headers, footers or
 * section properties — only replaces the tagged text content.
 */

const fs            = require('fs');
const path          = require('path');
const PizZip        = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { toWords, fmtRs } = require('./words');

// ── Normalise address input: string | string[] → single string ────
function addr(v) {
  if (!v) return '';
  if (Array.isArray(v)) return v.filter(Boolean).join(', ');
  return String(v).replace(/\n/g, ', ').trim();
}

// ── Format date string DD/MM/YYYY → keep as-is, or format Date obj ─
function fmtDate(v) {
  if (!v) return '_______________';
  if (typeof v === 'string' && v.includes('/')) return v;   // already formatted
  const d = new Date(v);
  if (isNaN(d)) return v;
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

// ── Build the full variable map from the incoming JSON payload ─────
function buildVars(D) {
  const dirs    = D.directors || [];
  const cheques = (D.cheques  || []).map((c, i) => ({
    SR_NO:          String(i + 1),
    CHEQUE_NO:      c.no     || '',
    CHEQUE_DATE:    c.date   || '',
    CHEQUE_AMOUNT:  c.amount ? Number(c.amount).toLocaleString('en-IN') : '',
  }));

  const amt  = Number(D.loan?.boeAmount)    || 0;
  const rate = Number(D.loan?.ratePercent)  || 0;
  const mnth = Number(D.loan?.tenureMonths) || 0;
  const intr = D.loan?.interestAmount != null
    ? Number(D.loan.interestAmount)
    : Math.round(amt * (rate / 100) * mnth);
  const net  = D.loan?.netDisbursed != null
    ? Number(D.loan.netDisbursed)
    : amt - intr;

  // Director signature line  "(NAME1)     (NAME2)"
  const dirSigLine  = dirs.map(d => `(${d.name})`).join('     ');
  // Director and/or line     "NAME1 and/or NAME2"
  const dirAndOr    = dirs.map(d => d.name).join(' and/or ');
  // All director names comma separated
  const allDirNames = dirs.map(d => d.name).join(', ');

  return {
    // ── Lender ──────────────────────────────────────────────
    LENDER_NAME:    D.lender?.name    || '',
    LENDER_PAN:     D.lender?.pan     || '',
    LENDER_ADDRESS: addr(D.lender?.address),

    // ── Company ─────────────────────────────────────────────
    COMPANY_NAME:    D.company?.name    || '',
    COMPANY_PAN:     D.company?.pan     || '',
    COMPANY_CIN:     D.company?.cin     || '',
    COMPANY_ADDRESS: addr(D.company?.address),
    COMPANY_PHONE:   D.company?.phone   || '',
    COMPANY_EMAIL:   D.company?.email   || '',

    // ── Loan figures ─────────────────────────────────────────
    LOAN_AMOUNT:           String(amt),
    LOAN_AMOUNT_FMT:       fmtRs(amt),
    LOAN_AMOUNT_WORDS:     toWords(amt),
    INTEREST_AMOUNT:       String(intr),
    INTEREST_AMOUNT_FMT:   fmtRs(intr),
    INTEREST_AMOUNT_WORDS: toWords(intr),
    NET_DISBURSED:         String(net),
    NET_DISBURSED_FMT:     fmtRs(net),
    NET_DISBURSED_WORDS:   toWords(net),
    RATE_PERCENT:          rate.toFixed(2),
    TENURE_MONTHS:         String(mnth),

    // ── Dates ────────────────────────────────────────────────
    REQUEST_DATE:      fmtDate(D.loan?.requestDate),
    DISBURSEMENT_DATE: fmtDate(D.loan?.disbursementDate),
    BOARD_RES_DATE:    D.loan?.boardResDate || '',
    BOARD_DATE:        D.loan?.boardResDate || '',

    // ── Payment references ───────────────────────────────────
    RTGS_NO:   D.loan?.rtgsNo   || '',
    RTGS_BANK: D.loan?.rtgsBank || '',
    PLACE:     D.loan?.place    || 'Mumbai',

    // ── Director convenience scalars (first director) ────────
    DIRECTOR_1_NAME:    dirs[0]?.name    || '',
    DIRECTOR_1_PAN:     dirs[0]?.pan     || '',
    DIRECTOR_1_AADHAAR: dirs[0]?.aadhaar || '',
    DIRECTOR_1_MOBILE:  dirs[0]?.mobile  || '',
    DIRECTOR_1_ADDRESS: addr(dirs[0]?.address),
    DIRECTOR_2_NAME:    dirs[1]?.name    || '',
    DIRECTOR_2_PAN:     dirs[1]?.pan     || '',
    DIRECTOR_2_AADHAAR: dirs[1]?.aadhaar || '',
    DIRECTOR_2_MOBILE:  dirs[1]?.mobile  || '',
    DIRECTOR_2_ADDRESS: addr(dirs[1]?.address),
    DIRECTOR_3_NAME:    dirs[2]?.name    || '',
    DIRECTOR_3_PAN:     dirs[2]?.pan     || '',

    // ── Director aggregate strings ───────────────────────────
    ALL_DIRECTOR_NAMES: allDirNames,
    DIRECTOR_SIG_LINE:  dirSigLine,
    DIRECTOR_AND_OR:    dirAndOr,

    // ── Loop arrays (used in {#directors}…{/directors} tags) ─
    directors: dirs.map(d => ({
      DIRECTOR_NAME:    d.name    || '',
      DIRECTOR_PAN:     d.pan     || '',
      DIRECTOR_AADHAAR: d.aadhaar || '',
      DIRECTOR_MOBILE:  d.mobile  || '',
      DIRECTOR_ADDRESS: addr(d.address),
    })),

    // ── Cheque loop array ─────────────────────────────────────
    cheques,

    // ── Cheque plain-text table (for simple single-cell insert) ─
    CHEQUE_TABLE: cheques.length
      ? cheques.map(c =>
          `${c.SR_NO}. Cheque No: ${c.CHEQUE_NO || '______'}  Date: ${c.CHEQUE_DATE}  Amount: ${c.CHEQUE_AMOUNT}`
        ).join('\n')
      : '(no cheques entered)',
  };
}

// ── Render a DOCX template file → Buffer ──────────────────────────
function renderDocx(templatePath, vars) {
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}`);
  }
  const content = fs.readFileSync(templatePath, 'binary');
  const zip     = new PizZip(content);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks:    true,
    delimiters:    { start: '{{', end: '}}' },
    // Also support {# / } loop syntax for arrays
    nullGetter(part) {
      if (!part.module) return '';
      return null;
    },
  });

  doc.render(vars);

  return doc.getZip().generate({
    type:        'nodebuffer',
    compression: 'DEFLATE',
  });
}

// ── Render with per-director variable override ────────────────────
function renderDocxForDirector(templatePath, baseVars, director) {
  const vars = {
    ...baseVars,
    // Overwrite director scalars with this specific director
    DIRECTOR_NAME:    director.name    || '',
    DIRECTOR_PAN:     director.pan     || '',
    DIRECTOR_AADHAAR: director.aadhaar || '',
    DIRECTOR_MOBILE:  director.mobile  || '',
    DIRECTOR_ADDRESS: addr(director.address),
    BORROWER_NAME:    director.name    || '',
  };
  return renderDocx(templatePath, vars);
}

module.exports = { buildVars, renderDocx, renderDocxForDirector, toWords, fmtRs, addr, fmtDate };
