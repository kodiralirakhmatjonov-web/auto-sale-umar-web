import type { Env } from "./auth";

interface D1Result<T> {
  results?: T[];
}

interface D1StatementLike {
  bind(...values: unknown[]): D1StatementLike;
  run(): Promise<unknown>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

interface CarPrivacyRow {
  id: number;
  vin: string | null;
  short_description_ru: string | null;
  short_description_uz: string | null;
  description_ru: string | null;
  description_uz: string | null;
}

interface VariantVinRow {
  car_id: number;
  vin: string | null;
}

const VIN_PRIVACY_MIGRATION_KEY = "remove-public-vin-v1";
const VIN_TOKEN_RE = /\b[A-HJ-NPR-Z0-9]{17}\b/gi;
const VIN_WORD_RE = /\b(?:VIN|ВИН)\b/iu;

function statement(env: Env, query: string): D1StatementLike {
  return env.DB.prepare(query) as unknown as D1StatementLike;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Removes VIN values and VIN-specific sentences from text intended for public
 * rendering. Public clients never need vehicle identifiers or VIN-derived data.
 */
export function sanitizePublicVehicleText(
  value: string | null | undefined,
  knownVins: Array<string | null | undefined> = [],
): string {
  if (!value) return "";

  let output = value;
  const normalizedKnownVins = Array.from(new Set(
    knownVins
      .map((vin) => (typeof vin === "string" ? vin.trim().toUpperCase() : ""))
      .filter((vin) => vin.length >= 11),
  ));

  // Remove complete VIN-specific sentences, including derived details such as
  // check digits or model-year characters. None of that belongs in public copy.
  const sentenceChunks = output.match(/[^.!?\n]+[.!?]?|\n+/g) ?? [output];
  output = sentenceChunks.filter((chunk) => !VIN_WORD_RE.test(chunk)).join("");

  // Remove any known internal VIN even when it was pasted without a VIN label.
  for (const vin of normalizedKnownVins) {
    output = output.replace(new RegExp(`\\b${escapeRegExp(vin)}\\b`, "gi"), "");
  }

  // Final fail-safe for any remaining standard 17-character VIN.
  output = output.replace(VIN_TOKEN_RE, "");

  // Clean punctuation/spacing left by removal without rewriting the description.
  return output
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([—–-])\s*([,.;:!?])/g, "$2")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * One-time D1 cleanup for VIN values that were previously pasted into public
 * descriptions. The dedicated VIN fields remain untouched for admin use.
 * The function is idempotent and safe to call from public catalog requests.
 */
export async function ensureVinPrivacyCleanup(env: Env): Promise<void> {
  try {
    await statement(env, `
      CREATE TABLE IF NOT EXISTS privacy_migrations (
        migration_key TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    const applied = await statement(env, `
      SELECT migration_key
      FROM privacy_migrations
      WHERE migration_key = ?1
      LIMIT 1
    `).bind(VIN_PRIVACY_MIGRATION_KEY).first<{ migration_key: string }>();

    if (applied?.migration_key) return;

    const [carsResult, variantResult] = await Promise.all([
      statement(env, `
        SELECT
          id,
          vin,
          short_description_ru,
          short_description_uz,
          description_ru,
          description_uz
        FROM cars
      `).all<CarPrivacyRow>(),
      statement(env, `
        SELECT v.car_id, inv.vin
        FROM car_variants v
        INNER JOIN car_variant_inventory inv ON inv.variant_id = v.id
        WHERE inv.vin IS NOT NULL AND TRIM(inv.vin) <> ''
      `).all<VariantVinRow>(),
    ]);

    const vinsByCar = new Map<number, string[]>();
    for (const row of Array.isArray(variantResult.results) ? variantResult.results : []) {
      const vin = row.vin?.trim().toUpperCase();
      if (!vin) continue;
      const current = vinsByCar.get(row.car_id) ?? [];
      if (!current.includes(vin)) current.push(vin);
      vinsByCar.set(row.car_id, current);
    }

    for (const car of Array.isArray(carsResult.results) ? carsResult.results : []) {
      const knownVins = [car.vin, ...(vinsByCar.get(car.id) ?? [])];
      const shortRu = sanitizePublicVehicleText(car.short_description_ru, knownVins);
      const shortUz = sanitizePublicVehicleText(car.short_description_uz, knownVins);
      const descriptionRu = sanitizePublicVehicleText(car.description_ru, knownVins);
      const descriptionUz = sanitizePublicVehicleText(car.description_uz, knownVins);

      const changed =
        shortRu !== (car.short_description_ru ?? "") ||
        shortUz !== (car.short_description_uz ?? "") ||
        descriptionRu !== (car.description_ru ?? "") ||
        descriptionUz !== (car.description_uz ?? "");

      if (!changed) continue;

      await statement(env, `
        UPDATE cars
        SET
          short_description_ru = ?1,
          short_description_uz = ?2,
          description_ru = ?3,
          description_uz = ?4,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?5
      `).bind(shortRu, shortUz, descriptionRu, descriptionUz, car.id).run();
    }

    await statement(env, `
      INSERT OR IGNORE INTO privacy_migrations (migration_key)
      VALUES (?1)
    `).bind(VIN_PRIVACY_MIGRATION_KEY).run();
  } catch (error) {
    // Public rendering has its own sanitizer, so cleanup failure must never
    // make the public catalog unavailable or expose a VIN.
    console.error("VIN privacy cleanup failed", error);
  }
}
