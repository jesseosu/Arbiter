const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DB_PATH = path.join(__dirname, "../../../data/moderation.db");
const DB_DIR  = path.dirname(DB_PATH);
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS content_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    text        TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending',
    risk_score  REAL NOT NULL DEFAULT 0,
    category    TEXT NOT NULL DEFAULT 'NONE',
    signals     TEXT NOT NULL DEFAULT '{}',
    explanation TEXT NOT NULL DEFAULT '[]',
    locked_by   TEXT,
    locked_at   INTEGER,
    created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  );

  CREATE INDEX IF NOT EXISTS idx_content_status ON content_items(status);
  CREATE INDEX IF NOT EXISTS idx_content_created ON content_items(created_at DESC);

  CREATE TABLE IF NOT EXISTS moderation_actions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    content_id  INTEGER NOT NULL,
    actor       TEXT NOT NULL,
    action      TEXT NOT NULL,
    rule_id     INTEGER,
    rule_name   TEXT,
    request_id  TEXT,
    at          INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    FOREIGN KEY (content_id) REFERENCES content_items(id)
  );

  CREATE INDEX IF NOT EXISTS idx_actions_content ON moderation_actions(content_id);
  CREATE INDEX IF NOT EXISTS idx_actions_at ON moderation_actions(at DESC);

  CREATE TABLE IF NOT EXISTS moderation_rules (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    match_type  TEXT NOT NULL DEFAULT 'TEXT_CONTAINS',
    pattern     TEXT NOT NULL,
    category    TEXT NOT NULL DEFAULT 'SPAM',
    action      TEXT NOT NULL,
    weight      REAL NOT NULL DEFAULT 0.5,
    fired       INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  );

  CREATE TABLE IF NOT EXISTS appeals (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    content_id  INTEGER NOT NULL,
    requester   TEXT NOT NULL,
    reason      TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending',
    reviewed_by TEXT,
    reviewed_at INTEGER,
    created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    FOREIGN KEY (content_id) REFERENCES content_items(id)
  );

  CREATE INDEX IF NOT EXISTS idx_appeals_status ON appeals(status);
  CREATE INDEX IF NOT EXISTS idx_appeals_content ON appeals(content_id);
`);

module.exports = { db };
