'use strict';
const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const DB_PATH = path.join(__dirname, 'lendingapp.db');
const db = new Database(DB_PATH);

// Enable WAL for concurrent reads
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS parties (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    short_code  TEXT NOT NULL UNIQUE,
    address     TEXT,
    city        TEXT,
    state       TEXT,
    pincode     TEXT,
    phone       TEXT,
    email       TEXT,
    pan         TEXT,
    gst         TEXT,
    logo_path        TEXT,
    letterhead_path  TEXT,
    footer_path      TEXT,
    signature_path   TEXT,
    stamp_path       TEXT,
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS templates (
    id          TEXT PRIMARY KEY,
    party_id    TEXT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    doc_type    TEXT NOT NULL,
    label       TEXT NOT NULL,
    file_path   TEXT NOT NULL,
    variables   TEXT,
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(party_id, doc_type)
  );

  CREATE TABLE IF NOT EXISTS generated_docs (
    id           TEXT PRIMARY KEY,
    party_id     TEXT REFERENCES parties(id),
    party_name   TEXT,
    doc_types    TEXT,
    borrower     TEXT,
    loan_amount  REAL,
    zip_path     TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ── Seed default party if empty ───────────────────────────────
const count = db.prepare('SELECT COUNT(*) as c FROM parties').get();
if (count.c === 0) {
  const { v4: uuidv4 } = require('uuid');
  db.prepare(`
    INSERT INTO parties (id, name, short_code, address, city, state, pincode, phone, pan)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    uuidv4(),
    'Parshwa Capital Pvt Ltd',
    'PARSHWA',
    '101 Finance House, Marine Lines',
    'Mumbai', 'Maharashtra', '400001',
    '9876543210',
    'AABCP1234Z'
  );
}

// ── Party helpers ─────────────────────────────────────────────
const Party = {
  all:    () => db.prepare('SELECT * FROM parties ORDER BY name').all(),
  active: () => db.prepare('SELECT * FROM parties WHERE active=1 ORDER BY name').all(),
  get:    (id) => db.prepare('SELECT * FROM parties WHERE id=?').get(id),
  byCode: (code) => db.prepare('SELECT * FROM parties WHERE short_code=?').get(code),

  create(data) {
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    db.prepare(`
      INSERT INTO parties (id,name,short_code,address,city,state,pincode,phone,email,pan,gst)
      VALUES (@id,@name,@short_code,@address,@city,@state,@pincode,@phone,@email,@pan,@gst)
    `).run({ id, ...data });
    return id;
  },

  update(id, data) {
    const fields = Object.keys(data).map(k => `${k}=@${k}`).join(', ');
    db.prepare(`UPDATE parties SET ${fields}, updated_at=datetime('now') WHERE id=@id`)
      .run({ ...data, id });
  },

  updateAsset(id, field, filePath) {
    db.prepare(`UPDATE parties SET ${field}=?, updated_at=datetime('now') WHERE id=?`)
      .run(filePath, id);
  },

  delete(id) {
    db.prepare('UPDATE parties SET active=0 WHERE id=?').run(id);
  }
};

// ── Template helpers ──────────────────────────────────────────
const Template = {
  forParty:  (partyId) => db.prepare('SELECT * FROM templates WHERE party_id=? AND active=1').all(partyId),
  get:       (id) => db.prepare('SELECT * FROM templates WHERE id=?').get(id),
  getByType: (partyId, docType) =>
    db.prepare('SELECT * FROM templates WHERE party_id=? AND doc_type=? AND active=1').get(partyId, docType),

  upsert(data) {
    const { v4: uuidv4 } = require('uuid');
    const existing = Template.getByType(data.party_id, data.doc_type);
    if (existing) {
      db.prepare(`UPDATE templates SET label=@label, file_path=@file_path, variables=@variables WHERE id=@id`)
        .run({ ...data, id: existing.id });
      return existing.id;
    }
    const id = uuidv4();
    db.prepare(`
      INSERT INTO templates (id, party_id, doc_type, label, file_path, variables)
      VALUES (@id, @party_id, @doc_type, @label, @file_path, @variables)
    `).run({ id, ...data });
    return id;
  },

  delete(id) {
    db.prepare('UPDATE templates SET active=0 WHERE id=?').run(id);
  }
};

// ── History helpers ───────────────────────────────────────────
const History = {
  all:    (limit=50) => db.prepare('SELECT * FROM generated_docs ORDER BY created_at DESC LIMIT ?').all(limit),
  recent: (limit=10) => db.prepare('SELECT * FROM generated_docs ORDER BY created_at DESC LIMIT ?').all(limit),

  add(data) {
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    db.prepare(`
      INSERT INTO generated_docs (id, party_id, party_name, doc_types, borrower, loan_amount, zip_path)
      VALUES (@id, @party_id, @party_name, @doc_types, @borrower, @loan_amount, @zip_path)
    `).run({ id, ...data });
    return id;
  }
};

module.exports = { db, Party, Template, History };
