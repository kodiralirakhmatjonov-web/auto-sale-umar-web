-- Public VIN privacy hardening.
-- Dedicated VIN columns remain untouched for authenticated admin workflows.
-- Existing VIN values accidentally pasted into public descriptions are removed.

CREATE TABLE IF NOT EXISTS privacy_migrations (
  migration_key TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

UPDATE cars
SET
  short_description_ru = CASE
    WHEN vin IS NOT NULL AND TRIM(vin) <> '' THEN TRIM(REPLACE(short_description_ru, vin, ''))
    ELSE short_description_ru
  END,
  short_description_uz = CASE
    WHEN vin IS NOT NULL AND TRIM(vin) <> '' THEN TRIM(REPLACE(short_description_uz, vin, ''))
    ELSE short_description_uz
  END,
  description_ru = CASE
    WHEN vin IS NOT NULL AND TRIM(vin) <> '' THEN TRIM(
      REPLACE(
        REPLACE(
          REPLACE(description_ru, 'VIN данного автомобиля — ' || vin || '. ', ''),
          'VIN автомобиля — ' || vin || '. ',
          ''
        ),
        vin,
        ''
      )
    )
    ELSE description_ru
  END,
  description_uz = CASE
    WHEN vin IS NOT NULL AND TRIM(vin) <> '' THEN TRIM(REPLACE(description_uz, vin, ''))
    ELSE description_uz
  END
WHERE vin IS NOT NULL AND TRIM(vin) <> '';
