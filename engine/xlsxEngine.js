'use strict';
/**
 * XLSX Template Engine
 * ─────────────────────
 * Uses xlsx-populate to fill {{PLACEHOLDERS}} inside Excel template files.
 * Preserves:
 *   • Merged cells
 *   • Borders and fill colours
 *   • Column widths and row heights
 *   • Font styles and alignment
 *   • Print area / page setup
 *
 * Template cells contain  {{VARIABLE_NAME}}  text which gets replaced in-place.
 * Multi-director sections are handled by cloning rows (see injectDirectorRows).
 */

const fs           = require('fs');
const path         = require('path');
const XlsxPopulate = require('xlsx-populate');
const { toWords, fmtRs } = require('./words');

// ── Replace all {{VAR}} occurrences in a cell value string ────────
function replacePlaceholders(text, vars) {
  if (typeof text !== 'string') return text;
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    vars[key] !== undefined ? String(vars[key]) : `{{${key}}}`
  );
}

// ── Walk every cell of every sheet and replace placeholders ───────
async function renderXlsx(templatePath, vars) {
  if (!fs.existsSync(templatePath)) {
    throw new Error(`XLSX template not found: ${templatePath}`);
  }

  const wb = await XlsxPopulate.fromFileAsync(templatePath);

  wb.sheets().forEach(sheet => {
    sheet.usedRange()?.forEach(cell => {
      const val = cell.value();
      if (typeof val === 'string' && val.includes('{{')) {
        cell.value(replacePlaceholders(val, vars));
      }
    });
  });

  return wb.outputAsync();   // returns Buffer
}

// ── Build the flat variable map for XLSX templates ────────────────
function buildXlsxVars(D) {
  const { buildVars } = require('./templateEngine');
  const base = buildVars(D);

  // Add per-director flat vars for BoE / Prom Note single-director sheets
  // (multi-director handled separately via renderXlsxPerDirector)
  const dirs = D.directors || [];
  dirs.forEach((d, i) => {
    const n = i + 1;
    base[`DIR${n}_NAME`]    = d.name    || '';
    base[`DIR${n}_PAN`]     = d.pan     || '';
    base[`DIR${n}_AADHAAR`] = d.aadhaar || '';
    base[`DIR${n}_MOBILE`]  = d.mobile  || '';
    base[`DIR${n}_ADDRESS`] = Array.isArray(d.address) ? d.address.join(', ') : (d.address || '');
  });

  // Cheque rows flat vars (up to 12 cheques)
  (D.cheques || []).forEach((c, i) => {
    const n = i + 1;
    base[`CHQ${n}_NO`]     = c.no     || '';
    base[`CHQ${n}_DATE`]   = c.date   || '';
    base[`CHQ${n}_AMOUNT`] = c.amount ? Number(c.amount).toLocaleString('en-IN') : '';
  });

  return base;
}

module.exports = { renderXlsx, buildXlsxVars };
