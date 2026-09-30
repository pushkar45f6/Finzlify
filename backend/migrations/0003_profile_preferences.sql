ALTER TABLE profiles ADD COLUMN theme TEXT NOT NULL DEFAULT 'system'
  CHECK (theme IN ('system', 'light', 'dark'));
ALTER TABLE profiles ADD COLUMN notifications_enabled INTEGER NOT NULL DEFAULT 1
  CHECK (notifications_enabled IN (0, 1));
ALTER TABLE profiles ADD COLUMN cloud_sync_enabled INTEGER NOT NULL DEFAULT 1
  CHECK (cloud_sync_enabled IN (0, 1));
ALTER TABLE profiles ADD COLUMN profile_picture_ref TEXT
  CHECK (profile_picture_ref IS NULL OR (length(profile_picture_ref) <= 64 AND profile_picture_ref GLOB 'local:*'));
ALTER TABLE profiles ADD COLUMN monthly_budget REAL NOT NULL DEFAULT 0
  CHECK (monthly_budget >= 0);