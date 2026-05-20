'use strict';
/**
 * scripts/seedTemplates.js
 * ─────────────────────────
 * Creates ready-to-use DOCX / XLSX template files inside
 * templates/borrowers/nivriti/ (and _sample/) using docxtemplater-
 * compatible {{PLACEHOLDER}} syntax.
 *
 * These files can be edited in Microsoft Word / Excel to match
 * the exact production letterhead, then re-uploaded via the UI.
 *
 * Run:  node scripts/seedTemplates.js
 */

const path      = require('path');
const fs        = require('fs');
const { Document, Packer, Paragraph, TextRun, AlignmentType } = require('docx');
const ExcelJS   = require('exceljs');

const BORROWERS = ['nivriti', '_sample'];

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates', 'borrowers');

// ── Helper: create a minimal DOCX with placeholder text ──────────
async function makeDocxTemplate(lines) {
  const children = lines.map(l =>
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing:   { after: 160 },
      children:  [new TextRun({ text: l, font: 'Times New Roman', size: 22 })],
    })
  );
  const doc = new Document({
    sections: [{
      properties: {
        page: { size: { width: 12240, height: 15840 },
                margin: { top: 1080, right: 1080, bottom: 1080, left: 1260 } }
      },
      children,
    }]
  });
  return Packer.toBuffer(doc);
}

// ── Helper: create a minimal XLSX with placeholder cells ─────────
async function makeXlsxTemplate(cells) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');
  ws.columns = Array(13).fill(null).map((_,i) => ({ width: [4,6,14,16,16,6,6,6,6,14,14,6,6][i] || 10 }));
  cells.forEach(([r, c, v, bold]) => {
    const cell = ws.getCell(r, c);
    cell.value = v;
    cell.font  = { name: 'Times New Roman', size: 11, bold: !!bold };
    cell.alignment = { wrapText: true, vertical: 'middle' };
  });
  const buf = await wb.xlsx.writeBuffer();
  return buf;
}

// ── Template content definitions ─────────────────────────────────
const DOCS = {
  'request_letter.docx': async () => makeDocxTemplate([
    'DATE: {{REQUEST_DATE}}',
    '',
    'To,',
    '{{LENDER_NAME}},',
    '{{LENDER_ADDRESS}}',
    '',
    'Subject: Request for on demand bill of exchange discounting facility.',
    '',
    'Dear Sir,',
    '',
    'With respect to above mentioned subject, I/We request you to give On Demand bill of exchange',
    'discounting facility for {{LOAN_AMOUNT_FMT}} ({{LOAN_AMOUNT_WORDS}}) for which I/We will raise',
    'an On Demand Bill of Exchange in your favor. I/We are also ready to give On Demand bill of',
    'exchange discounting charges flat @ {{RATE_PERCENT}}% p.m. for a period of {{TENURE_MONTHS}} Months.',
    '',
    'Thanking You,',
    'Yours Faithfully',
    '',
    'For {{COMPANY_NAME}}',
    '',
    '{{DIRECTOR_SIG_LINE}}',
  ]),

  'authority_letter.docx': async () => makeDocxTemplate([
    'AUTHORITY LETTER',
    '',
    'Date: {{DISBURSEMENT_DATE}}',
    '',
    'To,',
    '{{LENDER_NAME}},',
    '{{LENDER_ADDRESS}}',
    '',
    'Dear Sir/Madam,',
    '',
    'I/We, the undersigned Directors of {{COMPANY_NAME}}, hereby authorize {{ALL_DIRECTOR_NAMES}}',
    'to avail bill of exchange discounting facility of {{LOAN_AMOUNT_FMT}} ({{LOAN_AMOUNT_WORDS}})',
    'from {{LENDER_NAME}} and also authorize the Directors to execute all documents as required',
    'and to issue cheques towards repayment thereof.',
    '',
    'Yours Truly,',
    '',
    'For {{COMPANY_NAME}}',
    '',
    '{{DIRECTOR_SIG_LINE}}',
  ]),

  'receipt.docx': async () => makeDocxTemplate([
    'RECEIPT',
    '',
    'Date: {{DISBURSEMENT_DATE}}',
    '',
    'To,',
    '{{LENDER_NAME}},',
    '{{LENDER_ADDRESS}}',
    '',
    'Dear Sir/Mam,',
    '',
    'We confirm having received CHEQUE / RTGS UTR No {{RTGS_NO}} drawn on dated {{DISBURSEMENT_DATE}}',
    'through {{RTGS_BANK}}, for {{LOAN_AMOUNT_FMT}} ({{LOAN_AMOUNT_WORDS}}) towards ON DEMAND BILL',
    'OF EXCHANGE Discounted of {{INTEREST_AMOUNT_FMT}} ({{INTEREST_AMOUNT_WORDS}}) after deducting',
    'On Demand bill of exchange discounting {{NET_DISBURSED_FMT}} ({{NET_DISBURSED_WORDS}}) as per',
    'our request.',
    '',
    'Revenue Stamp With Signature',
    '',
    'For {{COMPANY_NAME}}',
  ]),

  'board_resolution.docx': async () => makeDocxTemplate([
    'CERTIFIED TRUE COPY OF THE RESOLUTION PASSED AT THE MEETING OF THE BOARD OF',
    'DIRECTORS OF {{COMPANY_NAME}} HELD AT THE REGISTERED OFFICE OF THE COMPANY',
    'ON {{BOARD_RES_DATE}} AT 11.00 A.M',
    '',
    '"RESOLVED THAT, the board has decided to avail on demand bill of exchange discounting',
    'facility or any other facility for temporary financial accommodation on behalf of the',
    'company from {{LENDER_NAME}}.',
    '',
    '"FURTHER RESOLVED THAT {{ALL_DIRECTOR_NAMES}}, Directors be and is/are hereby',
    'authorised to do all such acts as may be considered necessary to give effect to this',
    'resolution and also to:',
    '',
    '  - To avail on demand bill of exchange discounting facility.',
    '  - To pay on demand bill of exchange discounting charges.',
    '  - To sign and execute all documents for availing such facility.',
    '  - To sign and issue cheques for repayments and discharge of liability.',
    '  - To take all necessary steps and actions in this behalf.',
    '',
    'For {{COMPANY_NAME}}',
    '',
    '{{DIRECTOR_SIG_LINE}}',
    '',
    'Company seal',
  ]),

  'personal_undertaking.docx': async () => makeDocxTemplate([
    'From,',
    '{{DIRECTOR_NAME}}',
    '{{DIRECTOR_ADDRESS}}',
    '',
    'Date: {{DISBURSEMENT_DATE}}',
    '',
    'To,',
    '{{LENDER_NAME}},',
    '{{LENDER_ADDRESS}}',
    '',
    'Sub: Confirmation & Undertaking',
    '',
    'Dear Sir,',
    '',
    'This is to confirm that I/We {{DIRECTOR_NAME}} in my personal capacity hereby admit',
    'my signature on bill of exchange dated {{DISBURSEMENT_DATE}}.',
    '',
    'I/We am aware that {{COMPANY_NAME}} has drawn the aforesaid bill of exchange in favour',
    'of {{LENDER_NAME}}. I/We am aware that {{LOAN_AMOUNT_FMT}} ({{LOAN_AMOUNT_WORDS}})',
    'is received by {{COMPANY_NAME}} vide RTGS No {{RTGS_NO}} dated {{DISBURSEMENT_DATE}}',
    'after deducting bill of exchange discounting charges of {{INTEREST_AMOUNT_FMT}}.',
    'The said amount is advanced for the period of {{TENURE_MONTHS}} Months.',
    '',
    'Thanking You, Sincerely Yours',
    '',
    '({{DIRECTOR_NAME}})',
    '',
    'AADHAR NO: {{DIRECTOR_AADHAAR}}',
    'PAN NO.: {{DIRECTOR_PAN}}',
    'MOBILE NO.: {{DIRECTOR_MOBILE}}',
  ]),

  'company_undertaking.docx': async () => makeDocxTemplate([
    'Undertaking & Confirmation',
    '',
    'Date: {{DISBURSEMENT_DATE}}',
    '',
    'To,',
    '{{LENDER_NAME}},',
    '{{LENDER_ADDRESS}}',
    '',
    'Dear Sir / Madam,',
    '',
    'This is to confirm that {{COMPANY_NAME}} have availed on Demand bill of exchange',
    'discounting facility of {{LOAN_AMOUNT_FMT}} ({{LOAN_AMOUNT_WORDS}}) from you.',
    '',
    'The sum of {{INTEREST_AMOUNT_FMT}} ({{INTEREST_AMOUNT_WORDS}}) has been deducted',
    'towards bill of exchange discounting charges @ {{RATE_PERCENT}}% pm for {{TENURE_MONTHS}} Months.',
    '',
    'BoE Amount: {{LOAN_AMOUNT_FMT}} | Disc. Charges: {{INTEREST_AMOUNT_FMT}}',
    'Net Received: {{NET_DISBURSED_FMT}} | Months: {{TENURE_MONTHS}} | Rate: {{RATE_PERCENT}}%',
    'RTGS No: {{RTGS_NO}}',
    '',
    'Cheques issued:',
    '{{CHEQUE_TABLE}}',
    '',
    'Thanking You,',
    'Yours Faithfully',
    '',
    'For {{COMPANY_NAME}}',
    '',
    '{{DIRECTOR_SIG_LINE}}',
  ]),
};

const XLSX_DOCS = {
  'bill_of_exchange.xlsx': async () => makeXlsxTemplate([
    [1, 5, 'BILL OF EXCHANGE', true],
    [2,10, 'DATE:',     true], [2,11, '{{DISBURSEMENT_DATE}}', true],
    [3,10, 'PLACE:',    true], [3,11, '{{PLACE}}'],
    [4, 2, 'Amount:',   true], [4, 3, 'Rs.'], [4,4, '{{LOAN_AMOUNT_FMT}}', true],
    [6, 2, 'On Demand pay at Mumbai to {{LENDER_NAME}} or order the sum of {{LOAN_AMOUNT_FMT}} ({{LOAN_AMOUNT_WORDS}}). For value received this day by transfer through RTGS/Cheque No.{{RTGS_NO}}, Dtd {{DISBURSEMENT_DATE}} drawn on {{RTGS_BANK}}.'],
    [8, 3, 'To,'],
    [9, 4, "Acceptor's Name, Address and Sign."],
    [11,1, 'Notice Of Dishonour Waived',   true],
    [11,10,'Notice Of Dishonour Waived',   true],
    [12,2, 'Revenue Stamp',  true],
    [12,1, 'ACCEPTED BY',    true],
    [13,4, '{{DIR1_NAME}}',  true],
    [14,4, '{{DIR1_ADDRESS}}'],
    [15,10,'Signature of Drawer', true],
    [16,3, 'AADHAR No:'], [16,4, '{{DIR1_AADHAAR}}', true],
    [16,10,'{{DIR1_NAME}}', true],
    [17,10,'{{COMPANY_NAME}}', true],
    [20,4, 'Drawn by:'], [21,4, '{{COMPANY_NAME}}', true],
    [22,4, "Drawer's Address:"], [23,4, '{{COMPANY_ADDRESS}}'],
  ]),

  'promissory_note.xlsx': async () => makeXlsxTemplate([
    [1, 5, 'PROMISSORY NOTE', true],
    [2,10, 'DATE:',  true], [2,11, '{{DISBURSEMENT_DATE}}', true],
    [3,10, 'PLACE:', true], [3,11, '{{PLACE}}'],
    [4, 2, 'Amount:',true], [4, 3, 'Rs.'], [4,4, '{{LOAN_AMOUNT_FMT}}', true],
    [6, 2, 'I/We, {{DIRECTOR_1_NAME}} on behalf of M/S. {{COMPANY_NAME}} make commitment to pay to {{LENDER_NAME}} [PAN: {{LENDER_PAN}}] the sum of {{LOAN_AMOUNT_FMT}} ({{LOAN_AMOUNT_WORDS}}). For value received this day.'],
    [9, 2, 'Signature'],
    [10,4, '{{DIR1_NAME}}', true],
    [11,4, '{{DIR1_ADDRESS}}'],
    [12,3, 'PAN No:'], [12,4, '{{DIR1_PAN}}', true],
    [10,10, 'Signature & Stamp of Borrower FOR: {{COMPANY_NAME}} (PAN: {{COMPANY_PAN}})', true],
  ]),
};

// ── Seed each borrower folder ─────────────────────────────────────
async function seed() {
  for (const borrower of BORROWERS) {
    const dir = path.join(TEMPLATES_DIR, borrower);
    fs.mkdirSync(dir, { recursive: true });

    for (const [filename, fn] of Object.entries(DOCS)) {
      const outPath = path.join(dir, filename);
      if (fs.existsSync(outPath)) {
        console.log(`  SKIP (exists): ${borrower}/${filename}`);
        continue;
      }
      const buf = await fn();
      fs.writeFileSync(outPath, buf);
      console.log(`  CREATED: ${borrower}/${filename}`);
    }

    for (const [filename, fn] of Object.entries(XLSX_DOCS)) {
      const outPath = path.join(dir, filename);
      if (fs.existsSync(outPath)) {
        console.log(`  SKIP (exists): ${borrower}/${filename}`);
        continue;
      }
      const buf = await fn();
      fs.writeFileSync(outPath, buf);
      console.log(`  CREATED: ${borrower}/${filename}`);
    }
  }
  console.log('\n✅  Seed complete.\n');
  console.log('Next steps:');
  console.log('  1. Open templates/borrowers/nivriti/*.docx in Microsoft Word.');
  console.log('  2. Apply your official letterhead, footer, logo.');
  console.log('  3. Keep all {{PLACEHOLDER}} tags exactly as-is.');
  console.log('  4. Upload via UI: Templates → Select Party → Upload Template.');
}

seed().catch(err => { console.error(err); process.exit(1); });
