PRAGMA foreign_keys = ON;

-- TV Mode second-sequence presentation metadata is intentionally stored in
-- a side table so the existing car_variant_media schema stays backwards-compatible.
CREATE TABLE IF NOT EXISTS car_display_media_settings (
  media_id INTEGER PRIMARY KEY,
  car_id INTEGER NOT NULL,
  is_display_cover INTEGER NOT NULL DEFAULT 0 CHECK (is_display_cover IN (0,1)),
  display_flip_horizontal INTEGER NOT NULL DEFAULT 0 CHECK (display_flip_horizontal IN (0,1)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_car_display_media_settings_car
  ON car_display_media_settings(car_id, is_display_cover, media_id);
