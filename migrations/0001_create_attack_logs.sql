CREATE TABLE IF NOT EXISTS attack_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip TEXT NOT NULL,
  country TEXT NOT NULL,
  asn INTEGER NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  reason TEXT NOT NULL,
  threat_score INTEGER NOT NULL,
  decoy_served TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attack_logs_timestamp
  ON attack_logs (timestamp DESC);
