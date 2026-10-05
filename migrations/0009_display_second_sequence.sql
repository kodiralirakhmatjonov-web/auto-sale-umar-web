PRAGMA foreign_keys = ON;

ALTER TABLE car_variant_media
  ADD COLUMN is_display_cover INTEGER NOT NULL DEFAULT 0 CHECK (is_display_cover IN (0,1));

ALTER TABLE car_variant_media
  ADD COLUMN display_flip_horizontal INTEGER NOT NULL DEFAULT 0 CHECK (display_flip_horizontal IN (0,1));

UPDATE car_variant_media
SET is_display_cover = 1
WHERE photo_group = 'exterior' AND is_cover = 1;

CREATE INDEX IF NOT EXISTS idx_car_variant_media_display_cover
  ON car_variant_media(car_id, is_display_cover, photo_group, sort_order, id);
