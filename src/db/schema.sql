PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS jobs (
  id            TEXT PRIMARY KEY,
  short_id      TEXT UNIQUE NOT NULL,
  url           TEXT NOT NULL UNIQUE,
  url_hash      TEXT NOT NULL UNIQUE,
  title_co_hash TEXT NOT NULL,
  title         TEXT,
  company       TEXT,
  location      TEXT,
  description   TEXT,
  posted_at     TEXT,
  score         INTEGER DEFAULT 0,
  tier          TEXT,
  run_id        TEXT,
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sent_jobs (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id   TEXT NOT NULL REFERENCES jobs(id),
  sent_at  TEXT DEFAULT (datetime('now')),
  run_id   TEXT
);

CREATE TABLE IF NOT EXISTS job_runs (
  id             TEXT PRIMARY KEY,
  run_type       TEXT,
  status         TEXT DEFAULT 'running',
  scraped_count  INTEGER DEFAULT 0,
  sent_count     INTEGER DEFAULT 0,
  duration_ms    INTEGER,
  error          TEXT,
  started_at     TEXT DEFAULT (datetime('now')),
  completed_at   TEXT
);

CREATE TABLE IF NOT EXISTS telegram_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id     TEXT,
  type       TEXT,
  sent_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_feedback (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id     TEXT,
  action     TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bot_state (
  key        TEXT PRIMARY KEY,
  value      TEXT
);

PRAGMA user_version = 2;

CREATE INDEX IF NOT EXISTS idx_jobs_url_hash  ON jobs(url_hash);
CREATE INDEX IF NOT EXISTS idx_jobs_title_co  ON jobs(title_co_hash);
CREATE INDEX IF NOT EXISTS idx_jobs_short_id  ON jobs(short_id);
CREATE INDEX IF NOT EXISTS idx_sent_sent_at   ON sent_jobs(sent_at);
