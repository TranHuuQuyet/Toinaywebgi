-- Cloudflare D1 Database Schema for Global Case Counter

CREATE TABLE IF NOT EXISTS counters (
    key TEXT PRIMARY KEY,
    value INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO counters (key, value)
VALUES ('case_opens', 0);

