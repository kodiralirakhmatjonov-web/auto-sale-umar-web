import type { Env } from "./auth";

const CREATE_DISPLAY_MEDIA_SETTINGS_SQL = `
  CREATE TABLE IF NOT EXISTS car_display_media_settings (
    media_id INTEGER PRIMARY KEY,
    car_id INTEGER NOT NULL,
    is_display_cover INTEGER NOT NULL DEFAULT 0 CHECK (is_display_cover IN (0,1)),
    display_flip_horizontal INTEGER NOT NULL DEFAULT 0 CHECK (display_flip_horizontal IN (0,1)),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )
`;

let ensured = false;
let ensurePromise: Promise<void> | null = null;

export async function ensureDisplayMediaSettings(env: Env): Promise<void> {
  if (ensured) return;
  if (ensurePromise) return ensurePromise;

  ensurePromise = env.DB.prepare(CREATE_DISPLAY_MEDIA_SETTINGS_SQL)
    .run()
    .then(() => {
      ensured = true;
    })
    .finally(() => {
      ensurePromise = null;
    });

  return ensurePromise;
}

export async function setDisplayCover(env: Env, mediaId: number, carId: number, enabled: boolean): Promise<void> {
  await ensureDisplayMediaSettings(env);
  if (enabled) {
    await env.DB.prepare(`UPDATE car_display_media_settings SET is_display_cover = 0, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE car_id = ?1`)
      .bind(carId)
      .run();
  }

  await env.DB.prepare(`
    INSERT INTO car_display_media_settings (media_id, car_id, is_display_cover, display_flip_horizontal)
    VALUES (?1, ?2, ?3, 0)
    ON CONFLICT(media_id) DO UPDATE SET
      car_id = excluded.car_id,
      is_display_cover = excluded.is_display_cover,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
  `).bind(mediaId, carId, enabled ? 1 : 0).run();
}

export async function setDisplayFlip(env: Env, mediaId: number, carId: number, enabled: boolean): Promise<void> {
  await ensureDisplayMediaSettings(env);
  await env.DB.prepare(`
    INSERT INTO car_display_media_settings (media_id, car_id, is_display_cover, display_flip_horizontal)
    VALUES (?1, ?2, 0, ?3)
    ON CONFLICT(media_id) DO UPDATE SET
      car_id = excluded.car_id,
      display_flip_horizontal = excluded.display_flip_horizontal,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
  `).bind(mediaId, carId, enabled ? 1 : 0).run();
}

export async function deleteDisplayMediaSetting(env: Env, mediaId: number): Promise<void> {
  await ensureDisplayMediaSettings(env);
  await env.DB.prepare(`DELETE FROM car_display_media_settings WHERE media_id = ?1`).bind(mediaId).run();
}
