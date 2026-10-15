CREATE TABLE IF NOT EXISTS download_daily (
  day TEXT NOT NULL,
  file TEXT NOT NULL,
  requests INTEGER NOT NULL DEFAULT 0 CHECK (requests >= 0),
  PRIMARY KEY (day, file)
);
