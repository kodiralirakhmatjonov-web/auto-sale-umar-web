import { json, type Env } from "../_lib/auth";
import { loadWeeklyCarViews } from "../_lib/car-views";
import { ensureVinPrivacyCleanup } from "../_lib/vin-privacy";
import {
  CAR_SELECT,
  isCarStatus,
  normalizeText,
  toPublicCatalogCar,
  validCountryCode,
  type CarListRow,
} from "./cars";

interface D1ListResult<T> {
  results?: T[];
}

interface D1ListStatementLike {
  bind(...values: unknown[]): D1ListStatementLike;
  all<T = Record<string, unknown>>(): Promise<D1ListResult<T>>;
}

interface PublicVariantRow {
  car_id: number;
  variant_id: number;
  exterior_color_name: string | null;
  interior_color_name: string | null;
  exterior_swatch: string | null;
  interior_swatch: string | null;
  sort_order: number;
}

interface PublicMediaRow {
  id: number;
  car_id: number;
  variant_id: number;
  public_url: string;
  object_key: string;
  photo_group: "exterior" | "interior" | "detail";
  is_cover: number;
  sort_order: number;
}

interface PublicPerformanceRow {
  engine_displacement_l: number | null;
  horsepower_hp: number | null;
  torque_nm: number | null;
  acceleration_0_100_s: number | null;
  top_speed_kmh: number | null;
  fuel_consumption_l_100km: number | null;
  electric_range_km: number | null;
}

interface PublicLinkRow {
  instagram_url: string | null;
}

interface PublicVariant {
  id: number;
  exteriorColorName: string | null;
  exteriorSwatch: string;
  interiorColorName: string | null;
  interiorSwatch: string;
  photos: Array<{
    id: number;
    url: string;
    isCover: boolean;
    sortOrder: number;
  }>;
  interiorPhotos: Array<{
    id: number;
    url: string;
    isCover: boolean;
    sortOrder: number;
  }>;
  detailPhotos: Array<{
    id: number;
    url: string;
    isCover: boolean;
    sortOrder: number;
  }>;
}

function positiveInteger(value: string | null, fallback: number, maximum: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

async function loadPublicVariants(env: Env, carIds: number[], includeDetails = false): Promise<Map<number, PublicVariant[]>> {
  const byCar = new Map<number, PublicVariant[]>();
  if (carIds.length === 0) return byCar;

  const placeholders = carIds.map((_, index) => `?${index + 1}`).join(", ");
  const variantsStatement = (env.DB.prepare(`
    SELECT
      v.car_id,
      v.id AS variant_id,
      v.color_name_ru AS exterior_color_name,
      v.interior_color_ru AS interior_color_name,
      st.exterior_swatch,
      st.interior_swatch,
      v.sort_order
    FROM car_variants v
    LEFT JOIN car_variant_style st ON st.variant_id = v.id
    WHERE v.car_id IN (${placeholders})
    ORDER BY v.car_id ASC, v.is_default DESC, v.sort_order ASC, v.id ASC
  `) as unknown as D1ListStatementLike).bind(...carIds);

  const detailClause = includeDetails ? " OR object_key LIKE '%/detail/%'" : "";
  const mediaStatement = (env.DB.prepare(`
    SELECT id, car_id, variant_id, public_url, object_key,
      CASE WHEN object_key LIKE '%/detail/%' THEN 'detail' ELSE photo_group END AS photo_group,
      is_cover, sort_order
    FROM car_variant_media
    WHERE car_id IN (${placeholders})
      AND (photo_group = 'exterior' OR (photo_group = 'interior' AND object_key NOT LIKE '%/detail/%')${detailClause})
    ORDER BY car_id ASC, variant_id ASC, photo_group ASC, is_cover DESC, sort_order ASC, id ASC
  `) as unknown as D1ListStatementLike).bind(...carIds);

  const [variantResult, mediaResult] = await Promise.all([
    variantsStatement.all<PublicVariantRow>(),
    mediaStatement.all<PublicMediaRow>(),
  ]);

  const mediaByVariant = new Map<number, PublicMediaRow[]>();
  for (const media of Array.isArray(mediaResult.results) ? mediaResult.results : []) {
    const current = mediaByVariant.get(media.variant_id) ?? [];
    current.push(media);
    mediaByVariant.set(media.variant_id, current);
  }

  for (const variant of Array.isArray(variantResult.results) ? variantResult.results : []) {
    const current = byCar.get(variant.car_id) ?? [];
    current.push({
      id: variant.variant_id,
      exteriorColorName: variant.exterior_color_name,
      exteriorSwatch: variant.exterior_swatch || "#111214",
      interiorColorName: variant.interior_color_name,
      interiorSwatch: variant.interior_swatch || "#111214",
      photos: (mediaByVariant.get(variant.variant_id) ?? [])
        .filter((media) => media.photo_group === "exterior")
        .map((media) => ({
          id: media.id,
          url: media.public_url,
          isCover: media.is_cover === 1,
          sortOrder: media.sort_order,
        })),
      interiorPhotos: (mediaByVariant.get(variant.variant_id) ?? [])
        .filter((media) => media.photo_group === "interior")
        .map((media) => ({
          id: media.id,
          url: media.public_url,
          isCover: media.is_cover === 1,
          sortOrder: media.sort_order,
        })),
      detailPhotos: (mediaByVariant.get(variant.variant_id) ?? [])
        .filter((media) => media.photo_group === "detail")
        .map((media) => ({
          id: media.id,
          url: media.public_url,
          isCover: media.is_cover === 1,
          sortOrder: media.sort_order,
        })),
    });
    byCar.set(variant.car_id, current);
  }

  return byCar;
}

async function publicCarBySlug(env: Env, slug: string): Promise<Response> {
  if (!slug || slug.length > 140) {
    return json({ success: false, error: "Некорректный адрес автомобиля." }, 400);
  }

  try {
    const car = await env.DB.prepare(
      `${CAR_SELECT}
       WHERE c.slug = ?1
         AND c.is_published = 1
         AND c.status <> 'hidden'
       LIMIT 1`,
    )
      .bind(slug)
      .first<CarListRow>();

    if (!car) {
      return json({ success: false, error: "Автомобиль не найден." }, 404);
    }

    const [variants, performance, links, weeklyViews] = await Promise.all([
      loadPublicVariants(env, [car.id], true),
      env.DB.prepare(`
        SELECT
          engine_displacement_l, horsepower_hp, torque_nm, acceleration_0_100_s,
          top_speed_kmh, fuel_consumption_l_100km, electric_range_km
        FROM car_performance
        WHERE car_id = ?1
        LIMIT 1
      `).bind(car.id).first<PublicPerformanceRow>(),
      env.DB.prepare(`
        SELECT instagram_url
        FROM car_links
        WHERE car_id = ?1
        LIMIT 1
      `).bind(car.id).first<PublicLinkRow>(),
      loadWeeklyCarViews(env, [car.id]),
    ]);

    return json({
      success: true,
      car: {
        ...toPublicCatalogCar(car),
        engineDisplacementL: performance?.engine_displacement_l ?? null,
        horsepowerHp: performance?.horsepower_hp ?? null,
        torqueNm: performance?.torque_nm ?? null,
        acceleration0100: performance?.acceleration_0_100_s ?? null,
        topSpeedKmh: performance?.top_speed_kmh ?? null,
        fuelConsumptionL100: performance?.fuel_consumption_l_100km ?? null,
        electricRangeKm: performance?.electric_range_km ?? null,
        instagramUrl: links?.instagram_url ?? null,
        weeklyViews: weeklyViews.get(car.id) ?? 0,
        variants: variants.get(car.id) ?? [],
      },
    });
  } catch (error) {
    console.error("Public car detail failed", error);
    return json({ success: false, error: "Не удалось загрузить автомобиль." }, 500);
  }
}

export async function onRequestGet(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { request, env } = context;

  if (!env.DB) {
    return json({ success: false, error: "Каталог временно недоступен." }, 500);
  }

  await ensureVinPrivacyCleanup(env);

  const url = new URL(request.url);
  const slug = normalizeText(url.searchParams.get("slug"), 140);
  if (slug) return publicCarBySlug(env, slug);

  const q = normalizeText(url.searchParams.get("q"), 120);
  const rawStatus = normalizeText(url.searchParams.get("status"), 30);
  const rawCountry = normalizeText(url.searchParams.get("country"), 10).toUpperCase();
  const page = positiveInteger(url.searchParams.get("page"), 1, 10_000);
  const pageSize = positiveInteger(url.searchParams.get("pageSize"), 24, 100);
  const offset = (page - 1) * pageSize;

  const where = ["c.is_published = 1", "c.status <> 'hidden'"];
  const bindings: unknown[] = [];

  if (rawStatus && rawStatus !== "all") {
    if (!isCarStatus(rawStatus) || rawStatus === "hidden") {
      return json({ success: false, error: "Некорректный статус автомобиля." }, 400);
    }
    bindings.push(rawStatus);
    where.push(`c.status = ?${bindings.length}`);
  }

  if (rawCountry && rawCountry !== "ALL") {
    if (!validCountryCode(rawCountry)) {
      return json({ success: false, error: "Некорректный код страны." }, 400);
    }
    bindings.push(rawCountry);
    where.push(`c.source_country = ?${bindings.length}`);
  }

  if (q) {
    bindings.push(`%${q}%`);
    const position = bindings.length;
    where.push(
      `(b.name LIKE ?${position} COLLATE NOCASE
        OR c.model LIKE ?${position} COLLATE NOCASE
        OR c.trim LIKE ?${position} COLLATE NOCASE)`,
    );
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;
  const limitPosition = bindings.length + 1;
  const offsetPosition = bindings.length + 2;
  const listBindings = [...bindings, pageSize, offset];

  const listSql = `
    ${CAR_SELECT}
    ${whereSql}
    ORDER BY
      c.is_featured DESC,
      CASE WHEN datetime(c.created_at) >= datetime('now', '-30 days') THEN 1 ELSE 0 END DESC,
      CASE c.status
        WHEN 'in_stock' THEN 0
        WHEN 'in_showroom' THEN 1
        WHEN 'in_transit' THEN 2
        WHEN 'made_to_order' THEN 3
        WHEN 'reserved' THEN 4
        WHEN 'sold' THEN 5
        ELSE 6
      END,
      c.updated_at DESC,
      c.id DESC
    LIMIT ?${limitPosition}
    OFFSET ?${offsetPosition}
  `;

  const countSql = `
    SELECT COUNT(*) AS count
    FROM cars c
    INNER JOIN brands b ON b.id = c.brand_id
    ${whereSql}
  `;

  try {
    const prepared = env.DB.prepare(listSql) as unknown as D1ListStatementLike;
    const result = await prepared.bind(...listBindings).all<CarListRow>();
    const rows = Array.isArray(result.results) ? result.results : [];
    const carIds = rows.map((row) => row.id);
    const [variants, weeklyViews] = await Promise.all([
      loadPublicVariants(env, carIds),
      loadWeeklyCarViews(env, carIds),
    ]);

    const countPrepared = env.DB.prepare(countSql);
    const countRow = bindings.length > 0
      ? await countPrepared.bind(...bindings).first<{ count: number }>()
      : await countPrepared.first<{ count: number }>();
    const total = countRow?.count ?? rows.length;

    return json({
      success: true,
      page,
      pageSize,
      total,
      hasMore: offset + rows.length < total,
      cars: rows.map((row) => ({
        ...toPublicCatalogCar(row),
        weeklyViews: weeklyViews.get(row.id) ?? 0,
        variants: variants.get(row.id) ?? [],
      })),
    });
  } catch (error) {
    console.error("Public cars list failed", error);
    return json({ success: false, error: "Не удалось загрузить каталог автомобилей." }, 500);
  }
}

export function onRequest(): Response {
  return json({ success: false, error: "Используйте GET-запрос." }, 405, { allow: "GET" });
}
