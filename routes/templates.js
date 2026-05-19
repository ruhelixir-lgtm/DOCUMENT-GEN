'use strict';
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { Party, Template } = require('../data/db');

const router = express.Router();

const DOC_TYPES = [
  'bill_of_exchange',
  'promissory_note',
  'request_letter',
  'authority_letter',
  'receipt',
  'board_resolution',
  'personal_undertaking',
  'company_undertaking',
  'guarantee',
  'declaration'
];

const DOC_LABELS = {
  bill_of_exchange:    'Bill of Exchange',
  promissory_note:     'Promissory Note / DP Note',
  request_letter:      'Request Letter',
  authority_letter:    'Authority Letter',
  receipt:             'Receipt',
  board_resolution:    'Board Resolution',
  personal_undertaking:'Personal Conf. & Undertaking',
  company_undertaking: 'Company Undertaking & Confirmation',
  guarantee:           'Guarantee Letter',
  declaration:         'Declaration'
};

// ── Multer for DOCX templates ─────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const partyId = req.params.partyId || req.body.party_id;
    const party   = Party.get(partyId);
    const code    = party ? party.short_code : 'default';
    const dir     = path.join(__dirname, '..', 'templates', code);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const docType = req.body.doc_type || 'unknown';
    const ext     = path.extname(file.originalname).toLowerCase();
    cb(null, `${docType}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.docx', '.doc'].includes(ext)) cb(null, true);
    else cb(new Error('Only .docx files are allowed'));
  },
  limits: { fileSize: 20 * 1024 * 1024 }
});

// ── GET /api/templates/doctypes ───────────────────────────────
router.get('/doctypes', (_req, res) => {
  res.json({ ok: true, types: DOC_TYPES.map(t => ({ value: t, label: DOC_LABELS[t] })) });
});

// ── GET /api/templates/party/:partyId ─────────────────────────
router.get('/party/:partyId', (req, res) => {
  const party = Party.get(req.params.partyId);
  if (!party) return res.status(404).json({ ok: false, error: 'Party not found' });
  const templates = Template.forParty(req.params.partyId);
  // Annotate with labels
  const result = DOC_TYPES.map(dt => {
    const t = templates.find(x => x.doc_type === dt);
    return {
      doc_type: dt,
      label:    DOC_LABELS[dt],
      uploaded: !!t,
      template: t ? { id: t.id, label: t.label, created_at: t.created_at,
        url: '/' + path.relative(path.join(__dirname, '..'), t.file_path).replace(/\\/g, '/') } : null
    };
  });
  res.json({ ok: true, party_name: party.name, templates: result });
});

// ── POST /api/templates/party/:partyId/upload ─────────────────
router.post('/party/:partyId/upload', upload.single('template'), (req, res) => {
  if (!req.file)     return res.status(400).json({ ok: false, error: 'No file uploaded' });
  if (!req.body.doc_type) return res.status(400).json({ ok: false, error: 'doc_type required' });
  if (!DOC_TYPES.includes(req.body.doc_type))
    return res.status(400).json({ ok: false, error: `Invalid doc_type. Valid: ${DOC_TYPES.join(', ')}` });

  const id = Template.upsert({
    party_id:  req.params.partyId,
    doc_type:  req.body.doc_type,
    label:     DOC_LABELS[req.body.doc_type],
    file_path: req.file.path,
    variables: JSON.stringify(getDefaultVariables(req.body.doc_type))
  });
  res.json({ ok: true, id,
    url: '/' + path.relative(path.join(__dirname, '..'), req.file.path).replace(/\\/g, '/')
  });
});

// ── DELETE /api/templates/:id ─────────────────────────────────
router.delete('/:id', (req, res) => {
  const t = Template.get(req.params.id);
  if (!t) return res.status(404).json({ ok: false, error: 'Template not found' });
  try { fs.unlinkSync(t.file_path); } catch (_) {}
  Template.delete(req.params.id);
  res.json({ ok: true });
});

function getDefaultVariables(docType) {
  const common = [
    'BORROWER_NAME','COMPANY_NAME','COMPANY_PAN','COMPANY_ADDRESS',
    'LENDER_NAME','LENDER_PAN','LENDER_ADDRESS',
    'LOAN_AMOUNT','LOAN_AMOUNT_WORDS','INTEREST_AMOUNT','INTEREST_AMOUNT_WORDS',
    'NET_DISBURSED','NET_DISBURSED_WORDS','RATE_PERCENT','TENURE_MONTHS',
    'REQUEST_DATE','DISBURSEMENT_DATE','BOARD_RES_DATE',
    'RTGS_NO','RTGS_BANK','PLACE',
    'DIRECTOR_NAME','DIRECTOR_AADHAAR','DIRECTOR_PAN','DIRECTOR_MOBILE','DIRECTOR_ADDRESS'
  ];
  const extras = {
    bill_of_exchange:   ['ACCEPTED_BY','DRAWER_NAME'],
    promissory_note:    ['PROMISE_TEXT'],
    board_resolution:   ['ALL_DIRECTORS','BOARD_DATE'],
    company_undertaking:['CHEQUE_TABLE','DIRECTOR_SIGS'],
    personal_undertaking:['PERSONAL_UNDERTAKING_TEXT']
  };
  return [...common, ...(extras[docType] || [])];
}

module.exports = router;
