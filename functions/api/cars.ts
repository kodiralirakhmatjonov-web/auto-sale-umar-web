import {
  getAuthenticatedUser,
  json,
  type Env,
} from "../_lib/auth";
import { sanitizePublicVehicleText } from "../_lib/vin-privacy";

export type CarStatus =
  | "in_stock"
  | "in_showroom"
  | "in_transit"
  | "made_to_order"
  | "reserved"
  | "sold"
  | "hidden";

export type Currency = "USD" | "UZS" | "EUR";

interface CreateCarBody {
  brand?: unknown;
  model?: unknown;
  year?: unknown;
  trim?: unknown;
  status?: unknown;
  countryCode?: unknown;
  arrivalDate?: unknown;

  price?: unknown;
  currency?: unknown;
  priceOnRequest?: unknown;

  mileageKm?: unknown;
  fuelType?: unknown;
  driveType?: unknown;
  transmission?: unknown;
  engineText?: unknown;
  engineDisplacementL?: unknown;
  seats?: unknown;
  horsepowerHp?: unknown;
  torqueNm?: unknown;
  acceleration0100?: unknown;
  topSpeedKmh?: unknown;
  fuelConsumptionL100?: unknown;
  electricRangeKm?: unknown;

  instagramUrl?: unknown;
  variants?: unknown;

  shortDescriptionRu?: unknown;
  shortDescriptionUz?: unknown;
  descriptionRu?: unknown;
  descriptionUz?: unknown;

  isNew?: unknown;
  isPublic?: unknown;
  isFeatured?: unknown;
}

interface CreateVariantInput {
  exteriorColorName: string | null;
  exteriorSwatch: string;
  interiorColorName: string | null;
  interiorSwatch: string;
  vin: string | null;
  stockNumber: string | null;
  quantity: number;
}


interface D1ListResult<T> {
  results?: T[];
}

interface D1ListStatementLike {
  bind(...values: unknown[]): D1ListStatementLike;
  all<T = Record<string, unknown>>(): Promise<D1ListResult<T>>;
}

export interface CarListRow {
  id: number;
  slug: string;
  brand: string;
  model: string;
  year: number | null;
  trim: string | null;
  vin: string | null;
  stock_number: string | null;
  status: CarStatus;
  country_code: string | null;
  arrival_date: string | null;
  price: number | null;
  currency: Currency;
  price_on_request: number;
  mileage_km: number;
  engine_text: string | null;
  fuel_type: string | null;
  drive_type: string | null;
  transmission: string | null;
  seats: number | null;
  exterior_color: string | null;
  interior_color: string | null;
  short_description_ru: string;
  short_description_uz: string;
  description_ru: string;
  description_uz: string;
  is_new: number;
  is_new_arrival: number;
  is_public: number;
  is_featured: number;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
  cover_url: string | null;
}

interface BrandRow {
  id: number;
  name: string;
}

interface CardVariantRow {
  car_id: number;
  variant_id: number;
  exterior_color_name: string | null;
  interior_color_name: string | null;
  exterior_swatch: string | null;
  interior_swatch: string | null;
  vin: string | null;
  stock_number: string | null;
  quantity: number | null;
  sort_order: number;
}

interface CardMediaRow {
  id: number;
  car_id: number;
  variant_id: number;
  public_url: string;
  is_cover: number;
  sort_order: number;
}

export function normalizeText(value: unknown, maxLength = 500): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function nullableText(value: unknown, maxLength = 500): string | null {
  const text = normalizeText(value, maxLength);
  return text || null;
}

function parseOptionalInteger(
  value: unknown,
  min: number,
  max: number,
): number | null | "invalid" {
  if (value === "" || value == null) return null;

  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;

  if (!Number.isSafeInteger(number) || number < min || number > max) {
    return "invalid";
  }

  return number;
}

function parseOptionalNumber(
  value: unknown,
  min: number,
  max: number,
): number | null | "invalid" {
  if (value === "" || value == null) return null;
  const number = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim()
      ? Number(value.replace(",", "."))
      : Number.NaN;
  if (!Number.isFinite(number) || number < min || number > max) return "invalid";
  return number;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeInstagramUrl(value: unknown): string | null | "invalid" {
  const raw = normalizeText(value, 500);
  if (!raw) return null;
  try {
    const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(candidate);
    if (!/(^|\.)instagram\.com$/i.test(url.hostname)) return "invalid";
    url.protocol = "https:";
    return url.toString().slice(0, 500);
  } catch {
    return "invalid";
  }
}

function validHexColor(value: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(value);
}

function parseVariants(value: unknown): CreateVariantInput[] | "invalid" {
  if (!Array.isArray(value) || value.length < 1 || value.length > 20) return "invalid";
  const variants: CreateVariantInput[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return "invalid";
    const row = raw as Record<string, unknown>;
    const exteriorColorName = nullableText(row.exteriorColorName, 120);
    const interiorColorName = nullableText(row.interiorColorName, 120);
    const exteriorSwatch = normalizeText(row.exteriorSwatch, 7) || "#111214";
    const interiorSwatch = normalizeText(row.interiorSwatch, 7) || "#111214";
    const vin = nullableText(row.vin, 17)?.toUpperCase() ?? null;
    const stockNumber = nullableText(row.stockNumber, 80)?.toUpperCase() ?? null;
    const quantity = parseOptionalInteger(row.quantity, 1, 99);

    if (!validHexColor(exteriorSwatch) || !validHexColor(interiorSwatch)) return "invalid";
    if (vin && !/^[A-HJ-NPR-Z0-9]{11,17}$/.test(vin)) return "invalid";
    if (quantity === "invalid") return "invalid";

    variants.push({
      exteriorColorName,
      exteriorSwatch,
      interiorColorName,
      interiorSwatch,
      vin,
      stockNumber,
      quantity: quantity ?? 1,
    });
  }
  return variants;
}

export function isCarStatus(value: string): value is CarStatus {
  return [
    "in_stock",
    "in_showroom",
    "in_transit",
    "made_to_order",
    "reserved",
    "sold",
    "hidden",
  ].includes(value);
}

function isCurrency(value: string): value is Currency {
  return value === "USD" || value === "UZS" || value === "EUR";
}

export function validCountryCode(value: string): boolean {
  return value === "" || /^[A-Z]{2}$/.test(value);
}

function validIsoDate(value: string): boolean {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isUniqueConstraintError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /unique|constraint/i.test(message);
}

function slugify(value: string): string {
  const result = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);

  return result || "car";
}

function shortText(value: string, fallback: string): string {
  const clean = value.trim() || fallback.trim();
  return clean.slice(0, 220);
}

function fuelLabels(value: string | null): { ru: string | null; uz: string | null } {
  if (!value) return { ru: null, uz: null };

  const labels: Record<string, { ru: string; uz: string }> = {
    gasoline: { ru: "Бензин", uz: "Benzin" },
    diesel: { ru: "Дизель", uz: "Dizel" },
    hybrid: { ru: "Гибрид", uz: "Gibrid" },
    phev: { ru: "Подключаемый гибрид", uz: "Plug-in gibrid" },
    electric: { ru: "Электро", uz: "Elektr" },
  };

  return labels[value] ?? { ru: value, uz: value };
}

function transmissionLabels(value: string | null): { ru: string | null; uz: string | null } {
  if (!value) return { ru: null, uz: null };

  const labels: Record<string, { ru: string; uz: string }> = {
    automatic: { ru: "Автомат", uz: "Avtomat" },
    robot: { ru: "Робот", uz: "Robot" },
    cvt: { ru: "Вариатор", uz: "Variator" },
    manual: { ru: "Механика", uz: "Mexanika" },
  };

  return labels[value] ?? { ru: value, uz: value };
}

function drivetrainLabels(value: string | null): { ru: string | null; uz: string | null } {
  if (!value) return { ru: null, uz: null };
  return { ru: value, uz: value };
}

export function toStaffCar(row: CarListRow) {
  return {
    id: row.id,
    slug: row.slug,
    brand: row.brand,
    model: row.model,
    year: row.year,
    trim: row.trim,
    vin: row.vin,
    stockNumber: row.stock_number,
    status: row.status,
    countryCode: row.country_code,
    arrivalDate: row.arrival_date,
    price: row.price,
    currency: row.currency,
    priceOnRequest: row.price_on_request === 1,
    mileageKm: row.mileage_km,
    bodyType: null,
    fuelType: row.fuel_type,
    driveType: row.drive_type,
    transmission: row.transmission,
    engineText: row.engine_text,
    seats: row.seats,
    exteriorColor: row.exterior_color,
    interiorColor: row.interior_color,
    shortDescriptionRu: row.short_description_ru,
    shortDescriptionUz: row.short_description_uz,
    descriptionRu: row.description_ru,
    descriptionUz: row.description_uz,
    isNew: row.is_new === 1,
    isNewArrival: row.is_new_arrival === 1,
    isPublic: row.is_public === 1,
    isFeatured: row.is_featured === 1,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    coverUrl: row.cover_url,
  };
}

export function toPublicCatalogCar(row: CarListRow) {
  return {
    id: row.id,
    slug: row.slug,
    brand: row.brand,
    model: row.model,
    year: row.year,
    trim: row.trim,
    status: row.status,
    countryCode: row.country_code,
    arrivalDate: row.arrival_date,
    price: row.price,
    currency: row.currency,
    priceOnRequest: row.price_on_request === 1,
    mileageKm: row.mileage_km,
    fuelType: row.fuel_type,
    driveType: row.drive_type,
    transmission: row.transmission,
    engineText: row.engine_text,
    seats: row.seats,
    exteriorColor: row.exterior_color,
    interiorColor: row.interior_color,
    shortDescriptionRu: sanitizePublicVehicleText(row.short_description_ru, [row.vin]),
    shortDescriptionUz: sanitizePublicVehicleText(row.short_description_uz, [row.vin]),
    descriptionRu: sanitizePublicVehicleText(row.description_ru, [row.vin]),
    descriptionUz: sanitizePublicVehicleText(row.description_uz, [row.vin]),
    isNew: row.is_new === 1,
    isNewArrival: row.is_new_arrival === 1,
    isFeatured: row.is_featured === 1,
    updatedAt: row.updated_at,
    coverUrl: row.cover_url,
  };
}

export const CAR_SELECT = `
  SELECT
    c.id,
    c.slug,
    b.name AS brand,
    c.model,
    c.model_year AS year,
    c.trim,
    c.vin,
    c.stock_number,
    c.status,
    c.source_country AS country_code,
    c.arrival_date,
    c.price_amount AS price,
    c.price_currency AS currency,
    c.price_on_request,
    c.mileage_km,
    s.engine_name AS engine_text,
    s.fuel_type_ru AS fuel_type,
    s.drivetrain_ru AS drive_type,
    s.transmission_ru AS transmission,
    s.seats,
    v.color_name_ru AS exterior_color,
    v.interior_color_ru AS interior_color,
    c.short_description_ru,
    c.short_description_uz,
    c.description_ru,
    c.description_uz,
    c.is_new,
    CASE WHEN datetime(c.created_at) >= datetime('now', '-30 days') THEN 1 ELSE 0 END AS is_new_arrival,
    c.is_published AS is_public,
    c.is_featured,
    c.created_by,
    c.updated_by,
    c.created_at,
    c.updated_at,
    COALESCE(
      (
        SELECT cvm.public_url
        FROM car_variant_media cvm
        WHERE cvm.car_id = c.id
          AND cvm.photo_group = 'exterior'
        ORDER BY cvm.is_cover DESC, cvm.sort_order ASC, cvm.id ASC
        LIMIT 1
      ),
      (
        SELECT cm.public_url
        FROM car_media cm
        WHERE cm.car_id = c.id
          AND cm.media_type = 'image'
        ORDER BY cm.is_cover DESC, cm.sort_order ASC, cm.id ASC
        LIMIT 1
      )
    ) AS cover_url
  FROM cars c
  INNER JOIN brands b ON b.id = c.brand_id
  LEFT JOIN car_specs s ON s.car_id = c.id
  LEFT JOIN car_variants v ON v.id = (
    SELECT cv.id
    FROM car_variants cv
    WHERE cv.car_id = c.id
    ORDER BY cv.is_default DESC, cv.sort_order ASC, cv.id ASC
    LIMIT 1
  )
`;

async function ensureBrand(env: Env, brandName: string): Promise<BrandRow> {
  const existing = await env.DB.prepare(
    `SELECT id, name
     FROM brands
     WHERE lower(name) = lower(?1)
     LIMIT 1`,
  )
    .bind(brandName)
    .first<BrandRow>();

  if (existing) return existing;

  const baseSlug = slugify(brandName);

  try {
    const created = await env.DB.prepare(
      `INSERT INTO brands (slug, name, is_active)
       VALUES (?1, ?2, 1)
       RETURNING id, name`,
    )
      .bind(baseSlug, brandName)
      .first<BrandRow>();

    if (created) return created;
  } catch (error) {
    const raced = await env.DB.prepare(
      `SELECT id, name
       FROM brands
       WHERE lower(name) = lower(?1)
       LIMIT 1`,
    )
      .bind(brandName)
      .first<BrandRow>();

    if (raced) return raced;

    if (!isUniqueConstraintError(error)) throw error;
  }

  const createdWithSuffix = await env.DB.prepare(
    `INSERT INTO brands (slug, name, is_active)
     VALUES (?1, ?2, 1)
     RETURNING id, name`,
  )
    .bind(`${baseSlug}-${crypto.randomUUID().slice(0, 6)}`, brandName)
    .first<BrandRow>();

  if (!createdWithSuffix) {
    throw new Error("D1 did not return the created brand row.");
  }

  return createdWithSuffix;
}

async function getCarById(env: Env, id: number): Promise<CarListRow | null> {
  return env.DB.prepare(`${CAR_SELECT} WHERE c.id = ?1 LIMIT 1`)
    .bind(id)
    .first<CarListRow>();
}

export async function onRequestGet(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { request, env } = context;

  if (!env.DB || !env.AUTH_PEPPER) {
    return json({ success: false, error: "Серверная конфигурация не завершена." }, 500);
  }

  const currentUser = await getAuthenticatedUser(request, env);
  if (!currentUser) {
    return json({ success: false, error: "Требуется вход в систему." }, 401);
  }

  if (currentUser.role !== "super_admin" && currentUser.role !== "admin" && currentUser.role !== "sales_manager") {
    return json({ success: false, error: "Недостаточно прав для управления автомобилями." }, 403);
  }

  const url = new URL(request.url);
  const q = normalizeText(url.searchParams.get("q"), 120);
  const rawBrand = normalizeText(url.searchParams.get("brand"), 80);
  const rawStatus = normalizeText(url.searchParams.get("status"), 30);
  const rawCountry = normalizeText(url.searchParams.get("country"), 10).toUpperCase();

  const where: string[] = [];
  const bindings: unknown[] = [];

  if (rawBrand && rawBrand.toLowerCase() !== "all") {
    bindings.push(rawBrand);
    where.push(`b.name = ?${bindings.length} COLLATE NOCASE`);
  }

  if (rawStatus && rawStatus !== "all") {
    if (!isCarStatus(rawStatus)) {
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
        OR c.trim LIKE ?${position} COLLATE NOCASE
        OR c.vin LIKE ?${position} COLLATE NOCASE
        OR c.stock_number LIKE ?${position} COLLATE NOCASE
        OR EXISTS (
          SELECT 1
          FROM car_variants qv
          INNER JOIN car_variant_inventory qi ON qi.variant_id = qv.id
          WHERE qv.car_id = c.id
            AND (qi.vin LIKE ?${position} COLLATE NOCASE OR qi.stock_number LIKE ?${position} COLLATE NOCASE)
        ))`,
    );
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const listSql = `
    ${CAR_SELECT}
    ${whereSql}
    ORDER BY
      CASE c.status
        WHEN 'in_stock' THEN 0
        WHEN 'in_showroom' THEN 1
        WHEN 'in_transit' THEN 2
        WHEN 'made_to_order' THEN 3
        WHEN 'reserved' THEN 4
        WHEN 'sold' THEN 5
        WHEN 'hidden' THEN 6
        ELSE 7
      END,
      c.is_featured DESC,
      c.updated_at DESC,
      c.id DESC
    LIMIT 100
  `;

  const countSql = `
    SELECT COUNT(*) AS count
    FROM cars c
    INNER JOIN brands b ON b.id = c.brand_id
    ${whereSql}
  `;

  const brandsSql = `
    SELECT DISTINCT b.name AS name
    FROM cars c
    INNER JOIN brands b ON b.id = c.brand_id
    ORDER BY b.name COLLATE NOCASE ASC
  `;

  try {
    const listPrepared = env.DB.prepare(listSql) as unknown as D1ListStatementLike;
    const listStatement = bindings.length > 0
      ? listPrepared.bind(...bindings)
      : listPrepared;
    const listResult = await listStatement.all<CarListRow>();
    const rows = Array.isArray(listResult.results) ? listResult.results : [];

    const variantsByCar = new Map<number, Array<{
      id: number;
      exteriorColorName: string | null;
      exteriorSwatch: string;
      interiorColorName: string | null;
      interiorSwatch: string;
      vin: string | null;
      stockNumber: string | null;
      quantity: number;
      exteriorPhotos: Array<{ id: number; url: string; isCover: boolean; sortOrder: number }>;
    }>>();

    if (rows.length > 0) {
      const ids = rows.map((row) => row.id);
      const placeholders = ids.map((_, index) => `?${index + 1}`).join(", ");

      const variantsStatement = (env.DB.prepare(`
        SELECT
          v.car_id,
          v.id AS variant_id,
          v.color_name_ru AS exterior_color_name,
          v.interior_color_ru AS interior_color_name,
          st.exterior_swatch,
          st.interior_swatch,
          inv.vin,
          inv.stock_number,
          COALESCE(inv.quantity, v.quantity, 1) AS quantity,
          v.sort_order
        FROM car_variants v
        LEFT JOIN car_variant_style st ON st.variant_id = v.id
        LEFT JOIN car_variant_inventory inv ON inv.variant_id = v.id
        WHERE v.car_id IN (${placeholders})
        ORDER BY v.car_id ASC, v.sort_order ASC, v.id ASC
      `) as unknown as D1ListStatementLike).bind(...ids);

      const mediaStatement = (env.DB.prepare(`
        SELECT id, car_id, variant_id, public_url, is_cover, sort_order
        FROM car_variant_media
        WHERE car_id IN (${placeholders})
          AND photo_group = 'exterior'
        ORDER BY car_id ASC, variant_id ASC, is_cover DESC, sort_order ASC, id ASC
      `) as unknown as D1ListStatementLike).bind(...ids);

      const [variantResult, mediaResult] = await Promise.all([
        variantsStatement.all<CardVariantRow>(),
        mediaStatement.all<CardMediaRow>(),
      ]);

      const mediaByVariant = new Map<number, CardMediaRow[]>();
      for (const media of Array.isArray(mediaResult.results) ? mediaResult.results : []) {
        const current = mediaByVariant.get(media.variant_id) ?? [];
        current.push(media);
        mediaByVariant.set(media.variant_id, current);
      }

      for (const variant of Array.isArray(variantResult.results) ? variantResult.results : []) {
        const current = variantsByCar.get(variant.car_id) ?? [];
        current.push({
          id: variant.variant_id,
          exteriorColorName: variant.exterior_color_name,
          exteriorSwatch: variant.exterior_swatch || "#111214",
          interiorColorName: variant.interior_color_name,
          interiorSwatch: variant.interior_swatch || "#111214",
          vin: variant.vin,
          stockNumber: variant.stock_number,
          quantity: variant.quantity || 1,
          exteriorPhotos: (mediaByVariant.get(variant.variant_id) ?? []).map((media) => ({
            id: media.id,
            url: media.public_url,
            isCover: media.is_cover === 1,
            sortOrder: media.sort_order,
          })),
        });
        variantsByCar.set(variant.car_id, current);
      }
    }

    const countPrepared = env.DB.prepare(countSql);
    const [countRow, brandResult] = await Promise.all([
      bindings.length > 0
        ? countPrepared.bind(...bindings).first<{ count: number }>()
        : countPrepared.first<{ count: number }>(),
      (env.DB.prepare(brandsSql) as unknown as D1ListStatementLike).all<{ name: string }>(),
    ]);

    const brandNames = (Array.isArray(brandResult.results) ? brandResult.results : [])
      .map((row) => row.name?.trim())
      .filter((name): name is string => Boolean(name));

    return json({
      success: true,
      viewer: {
        id: currentUser.id,
        role: currentUser.role,
      },
      total: countRow?.count ?? rows.length,
      brands: brandNames,
      cars: rows.map((row) => ({
        ...toStaffCar(row),
        variants: variantsByCar.get(row.id) ?? [],
      })),
    });
  } catch (error) {
    console.error("Cars list failed", error);
    return json(
      {
        success: false,
        error: "Не удалось загрузить автомобили из D1.",
      },
      500,
    );
  }
}

export async function onRequestPost(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { request, env } = context;

  if (!env.DB || !env.AUTH_PEPPER) {
    return json({ success: false, error: "Серверная конфигурация не завершена." }, 500);
  }

  const currentUser = await getAuthenticatedUser(request, env);
  if (!currentUser) return json({ success: false, error: "Требуется вход в систему." }, 401);
  if (currentUser.role !== "super_admin" && currentUser.role !== "admin" && currentUser.role !== "sales_manager") {
    return json({ success: false, error: "Недостаточно прав для управления автомобилями." }, 403);
  }

  let body: CreateCarBody;
  try {
    body = (await request.json()) as CreateCarBody;
  } catch {
    return json({ success: false, error: "Некорректный JSON-запрос." }, 400);
  }

  const brandName = normalizeText(body.brand, 80);
  const model = normalizeText(body.model, 100);
  const trim = nullableText(body.trim, 120);
  const status = normalizeText(body.status, 30);
  const countryCode = normalizeText(body.countryCode, 10).toUpperCase();
  const rawArrivalDate = normalizeText(body.arrivalDate, 10);
  const arrivalDate = status === "in_transit" || status === "made_to_order" || status === "reserved"
    ? rawArrivalDate
    : "";
  const currencyText = normalizeText(body.currency, 10).toUpperCase() || "USD";

  if (!brandName) return json({ success: false, error: "Укажите марку автомобиля." }, 400);
  if (!model) return json({ success: false, error: "Укажите модель автомобиля." }, 400);
  if (!isCarStatus(status) || ["sold", "hidden"].includes(status)) {
    return json({ success: false, error: "Выберите корректный статус автомобиля." }, 400);
  }
  if (!validCountryCode(countryCode)) return json({ success: false, error: "Выберите корректную страну." }, 400);
  if (!validIsoDate(arrivalDate)) return json({ success: false, error: "Проверьте дату прибытия." }, 400);
  if (!isCurrency(currencyText)) return json({ success: false, error: "D1 поддерживает USD, UZS и EUR." }, 400);

  const year = parseOptionalInteger(body.year, 1900, 2100);
  const price = parseOptionalInteger(body.price, 0, 9_000_000_000_000);
  const mileageKm = parseOptionalInteger(body.mileageKm, 0, 20_000_000);
  const seats = parseOptionalInteger(body.seats, 1, 99);
  const horsepowerHp = parseOptionalInteger(body.horsepowerHp, 1, 5000);
  const torqueNm = parseOptionalInteger(body.torqueNm, 1, 10000);
  const topSpeedKmh = parseOptionalInteger(body.topSpeedKmh, 1, 1000);
  const electricRangeKm = parseOptionalInteger(body.electricRangeKm, 1, 5000);
  const engineDisplacementL = parseOptionalNumber(body.engineDisplacementL, 0.1, 20);
  const acceleration0100 = parseOptionalNumber(body.acceleration0100, 0.5, 60);
  const fuelConsumptionL100 = parseOptionalNumber(body.fuelConsumptionL100, 0.1, 100);

  const numericValues = [year, price, mileageKm, seats, horsepowerHp, torqueNm, topSpeedKmh, electricRangeKm, engineDisplacementL, acceleration0100, fuelConsumptionL100];
  if (numericValues.includes("invalid")) {
    return json({ success: false, error: "Проверьте числовые характеристики автомобиля." }, 400);
  }

  const instagramUrl = normalizeInstagramUrl(body.instagramUrl);
  if (instagramUrl === "invalid") return json({ success: false, error: "Проверьте ссылку Instagram." }, 400);

  const variants = parseVariants(body.variants);
  if (variants === "invalid") {
    return json({ success: false, error: "Проверьте цветовые варианты, VIN и количество." }, 400);
  }

  const vinSet = new Set<string>();
  const stockSet = new Set<string>();
  for (const variant of variants) {
    if (variant.vin) {
      if (vinSet.has(variant.vin)) return json({ success: false, error: "Один VIN указан дважды." }, 400);
      vinSet.add(variant.vin);
    }
    if (variant.stockNumber) {
      if (stockSet.has(variant.stockNumber)) return json({ success: false, error: "Один внутренний номер указан дважды." }, 400);
      stockSet.add(variant.stockNumber);
    }
  }

  const engineText = nullableText(body.engineText, 180);
  const fuelType = nullableText(body.fuelType, 80);
  const driveType = nullableText(body.driveType, 80);
  const transmission = nullableText(body.transmission, 80) ?? "automatic";

  const descriptionRuInputRaw = nullableText(body.descriptionRu, 10_000);
  const descriptionUzInputRaw = nullableText(body.descriptionUz, 10_000);
  const shortDescriptionRuInputRaw = nullableText(body.shortDescriptionRu, 220);
  const shortDescriptionUzInputRaw = nullableText(body.shortDescriptionUz, 220);
  const submittedVins = variants.map((variant) => variant.vin);
  const descriptionRuInput = descriptionRuInputRaw ? (sanitizePublicVehicleText(descriptionRuInputRaw, submittedVins) || null) : null;
  const descriptionUzInput = descriptionUzInputRaw ? (sanitizePublicVehicleText(descriptionUzInputRaw, submittedVins) || null) : null;
  const shortDescriptionRuInput = shortDescriptionRuInputRaw ? (sanitizePublicVehicleText(shortDescriptionRuInputRaw, submittedVins) || null) : null;
  const shortDescriptionUzInput = shortDescriptionUzInputRaw ? (sanitizePublicVehicleText(shortDescriptionUzInputRaw, submittedVins) || null) : null;

  const priceOnRequestInput = parseBoolean(body.priceOnRequest, price == null);
  const priceOnRequest = priceOnRequestInput || price == null;
  const finalPrice = priceOnRequest ? null : price;
  const isNew = parseBoolean(body.isNew, (mileageKm ?? 0) === 0);
  const isPublished = parseBoolean(body.isPublic, false);
  const isFeatured = parseBoolean(body.isFeatured, false);

  const fallbackDescription = [brandName, model, year, trim].filter((value) => value !== null && value !== "").join(" ");
  const descriptionRu = descriptionRuInput ?? fallbackDescription;
  const descriptionUz = descriptionUzInput ?? fallbackDescription;
  const shortDescriptionRu = shortDescriptionRuInput ?? shortText(descriptionRu, fallbackDescription);
  const shortDescriptionUz = shortDescriptionUzInput ?? shortText(descriptionUz, fallbackDescription);
  const carSlug = `${slugify([brandName, model, year, trim].filter(Boolean).join("-"))}-${crypto.randomUUID().slice(0, 8)}`;

  const fuel = fuelLabels(fuelType);
  const transmissionLabelsValue = transmissionLabels(transmission);
  const drivetrain = drivetrainLabels(driveType);
  const firstVariant = variants[0];

  try {
    for (const variant of variants) {
      if (variant.vin) {
        const existingCarVin = await env.DB.prepare(`SELECT id FROM cars WHERE vin = ?1 COLLATE NOCASE LIMIT 1`).bind(variant.vin).first<{ id: number }>();
        const existingVariantVin = await env.DB.prepare(`SELECT variant_id FROM car_variant_inventory WHERE vin = ?1 COLLATE NOCASE LIMIT 1`).bind(variant.vin).first<{ variant_id: number }>();
        if (existingCarVin || existingVariantVin) return json({ success: false, error: `VIN ${variant.vin} уже используется.` }, 409);
      }
      if (variant.stockNumber) {
        const existingCarStock = await env.DB.prepare(`SELECT id FROM cars WHERE stock_number = ?1 LIMIT 1`).bind(variant.stockNumber).first<{ id: number }>();
        const existingVariantStock = await env.DB.prepare(`SELECT variant_id FROM car_variant_inventory WHERE stock_number = ?1 LIMIT 1`).bind(variant.stockNumber).first<{ variant_id: number }>();
        if (existingCarStock || existingVariantStock) return json({ success: false, error: `Внутренний номер ${variant.stockNumber} уже используется.` }, 409);
      }
    }
  } catch (error) {
    console.error("Car duplicate check failed", error);
    return json({ success: false, error: "Не удалось проверить VIN. Убедитесь, что миграция 0002 применена." }, 500);
  }

  let createdCarId: number | null = null;

  try {
    const brand = await ensureBrand(env, brandName);
    const created = await env.DB.prepare(
      `INSERT INTO cars (
        brand_id, model, trim, model_year, vin, stock_number,
        short_description_ru, short_description_uz, description_ru, description_uz,
        price_amount, price_currency, price_on_request, status, source_country, arrival_date,
        mileage_km, is_new, is_featured, is_new_arrival, is_published, slug, created_by, updated_by
      ) VALUES (
        ?1, ?2, ?3, ?4, ?5, ?6,
        ?7, ?8, ?9, ?10,
        ?11, ?12, ?13, ?14, ?15, ?16,
        ?17, ?18, ?19, 1, ?20, ?21, ?22, ?22
      ) RETURNING id`,
    ).bind(
      brand.id,
      model,
      trim,
      year,
      firstVariant.vin,
      firstVariant.stockNumber,
      shortDescriptionRu,
      shortDescriptionUz,
      descriptionRu,
      descriptionUz,
      finalPrice,
      currencyText,
      priceOnRequest ? 1 : 0,
      status,
      countryCode || null,
      arrivalDate || null,
      isNew ? 0 : (mileageKm ?? 0),
      isNew ? 1 : 0,
      isFeatured ? 1 : 0,
      isPublished ? 1 : 0,
      carSlug,
      currentUser.id,
    ).first<{ id: number }>();

    if (!created?.id) throw new Error("D1 did not return the created car id.");
    createdCarId = created.id;

    const hasSpecs = Boolean(engineText || fuel.ru || transmissionLabelsValue.ru || drivetrain.ru || seats);
    if (hasSpecs) {
      await env.DB.prepare(
        `INSERT INTO car_specs (
          car_id, engine_name, fuel_type_ru, fuel_type_uz,
          transmission_ru, transmission_uz, drivetrain_ru, drivetrain_uz, seats
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
      ).bind(
        created.id,
        engineText,
        fuel.ru,
        fuel.uz,
        transmissionLabelsValue.ru,
        transmissionLabelsValue.uz,
        drivetrain.ru,
        drivetrain.uz,
        seats,
      ).run();
    }

    const performanceValues = [engineDisplacementL, horsepowerHp, torqueNm, acceleration0100, topSpeedKmh, fuelConsumptionL100, electricRangeKm];
    if (performanceValues.some((value) => value != null)) {
      await env.DB.prepare(
        `INSERT INTO car_performance (
          car_id, engine_displacement_l, horsepower_hp, torque_nm,
          acceleration_0_100_s, top_speed_kmh, fuel_consumption_l_100km, electric_range_km
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
      ).bind(
        created.id,
        engineDisplacementL,
        horsepowerHp,
        torqueNm,
        acceleration0100,
        topSpeedKmh,
        fuelConsumptionL100,
        electricRangeKm,
      ).run();
    }

    if (instagramUrl) {
      await env.DB.prepare(`INSERT INTO car_links (car_id, instagram_url) VALUES (?1, ?2)`).bind(created.id, instagramUrl).run();
    }

    const createdVariants: Array<{ id: number; index: number }> = [];
    for (let index = 0; index < variants.length; index += 1) {
      const variant = variants[index];
      const inserted = await env.DB.prepare(
        `INSERT INTO car_variants (
          car_id, color_name_ru, color_name_uz, interior_color_ru, interior_color_uz,
          quantity, is_default, sort_order
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8) RETURNING id`,
      ).bind(
        created.id,
        variant.exteriorColorName ?? "Не указан",
        variant.exteriorColorName ?? "Ko‘rsatilmagan",
        variant.interiorColorName,
        variant.interiorColorName,
        variant.quantity,
        index === 0 ? 1 : 0,
        index,
      ).first<{ id: number }>();

      if (!inserted?.id) throw new Error("D1 did not return a variant id.");

      await env.DB.prepare(
        `INSERT INTO car_variant_style (variant_id, exterior_swatch, interior_swatch)
         VALUES (?1, ?2, ?3)`,
      ).bind(inserted.id, variant.exteriorSwatch, variant.interiorSwatch).run();

      await env.DB.prepare(
        `INSERT INTO car_variant_inventory (variant_id, vin, stock_number, quantity)
         VALUES (?1, ?2, ?3, ?4)`,
      ).bind(inserted.id, variant.vin, variant.stockNumber, variant.quantity).run();

      createdVariants.push({ id: inserted.id, index });
    }

    const car = await getCarById(env, created.id);
    if (!car) throw new Error("Created car could not be loaded.");

    return json({
      success: true,
      message: "Автомобиль добавлен.",
      car: { ...toStaffCar(car), variants: createdVariants },
      writeVerified: true,
    }, 201);
  } catch (error) {
    if (createdCarId) {
      try { await env.DB.prepare(`DELETE FROM cars WHERE id = ?1`).bind(createdCarId).run(); } catch (cleanupError) { console.error("Car cleanup failed", cleanupError); }
    }
    if (isUniqueConstraintError(error)) return json({ success: false, error: "VIN или внутренний номер уже используется." }, 409);
    console.error("Car creation failed", error);
    return json({ success: false, error: "Не удалось добавить автомобиль. Проверьте, что миграция 0002 применена к D1." }, 500);
  }
}

export async function onRequestPatch(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { request, env } = context;
  if (!env.DB || !env.AUTH_PEPPER) return json({ success: false, error: "Серверная конфигурация не завершена." }, 500);

  const currentUser = await getAuthenticatedUser(request, env);
  if (!currentUser) return json({ success: false, error: "Требуется вход в систему." }, 401);
  if (currentUser.role !== "super_admin" && currentUser.role !== "admin" && currentUser.role !== "sales_manager") {
    return json({ success: false, error: "Недостаточно прав." }, 403);
  }

  let body: {
    id?: unknown;
    isPublic?: unknown;
    status?: unknown;
    price?: unknown;
    currency?: unknown;
    priceOnRequest?: unknown;
  };
  try {
    body = await request.json() as typeof body;
  } catch {
    return json({ success: false, error: "Некорректный JSON-запрос." }, 400);
  }

  const id = parseOptionalInteger(body.id, 1, 2_000_000_000);
  if (id === "invalid" || id == null) return json({ success: false, error: "Некорректный ID автомобиля." }, 400);

  const existing = await env.DB.prepare(`
    SELECT id, status, price_amount, price_currency, price_on_request, is_published
    FROM cars
    WHERE id = ?1
    LIMIT 1
  `).bind(id).first<{
    id: number;
    status: CarStatus;
    price_amount: number | null;
    price_currency: Currency;
    price_on_request: number;
    is_published: number;
  }>();

  if (!existing) return json({ success: false, error: "Автомобиль не найден." }, 404);

  const hasStatus = Object.prototype.hasOwnProperty.call(body, "status");
  const hasPrice = Object.prototype.hasOwnProperty.call(body, "price");
  const hasCurrency = Object.prototype.hasOwnProperty.call(body, "currency");
  const hasPriceOnRequest = Object.prototype.hasOwnProperty.call(body, "priceOnRequest");
  const hasIsPublic = Object.prototype.hasOwnProperty.call(body, "isPublic");

  if (!hasStatus && !hasPrice && !hasCurrency && !hasPriceOnRequest && !hasIsPublic) {
    return json({ success: false, error: "Не указаны изменения автомобиля." }, 400);
  }

  let nextStatus = existing.status;
  if (hasStatus) {
    const rawStatus = normalizeText(body.status, 30);
    if (!isCarStatus(rawStatus)) return json({ success: false, error: "Некорректный статус автомобиля." }, 400);
    nextStatus = rawStatus;
  }

  let nextCurrency = existing.price_currency || "USD";
  if (hasCurrency) {
    const rawCurrency = normalizeText(body.currency, 10).toUpperCase();
    if (!isCurrency(rawCurrency)) return json({ success: false, error: "Некорректная валюта." }, 400);
    nextCurrency = rawCurrency;
  }

  let nextPriceOnRequest = existing.price_on_request === 1;
  if (hasPriceOnRequest) {
    if (typeof body.priceOnRequest !== "boolean") {
      return json({ success: false, error: "Некорректное значение «Цена по запросу»." }, 400);
    }
    nextPriceOnRequest = body.priceOnRequest;
  }

  let nextPrice = existing.price_amount;
  if (hasPrice) {
    const parsedPrice = parseOptionalInteger(body.price, 0, 9_000_000_000_000);
    if (parsedPrice === "invalid") return json({ success: false, error: "Проверьте цену автомобиля." }, 400);
    nextPrice = parsedPrice;
  }
  if (nextPriceOnRequest) nextPrice = null;
  if (!nextPriceOnRequest && nextPrice == null) {
    return json({ success: false, error: "Укажите цену или включите «Цена по запросу»." }, 400);
  }

  let nextIsPublic = existing.is_published === 1;
  if (hasIsPublic) {
    if (typeof body.isPublic !== "boolean") return json({ success: false, error: "Некорректный статус публикации." }, 400);
    nextIsPublic = body.isPublic;
  }

  if (nextIsPublic) {
    const cover = await env.DB.prepare(
      `SELECT id FROM car_variant_media WHERE car_id = ?1 AND photo_group = 'exterior' LIMIT 1`,
    ).bind(id).first<{ id: number }>();
    if (!cover) return json({ success: false, error: "Для публикации добавьте хотя бы одну фотографию кузова." }, 400);
  }

  await env.DB.prepare(`
    UPDATE cars
    SET
      status = ?1,
      price_amount = ?2,
      price_currency = ?3,
      price_on_request = ?4,
      is_published = ?5,
      arrival_date = CASE
        WHEN ?1 IN ('in_transit', 'made_to_order', 'reserved') THEN arrival_date
        ELSE NULL
      END,
      updated_by = ?6,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?7
  `).bind(
    nextStatus,
    nextPrice,
    nextCurrency,
    nextPriceOnRequest ? 1 : 0,
    nextIsPublic ? 1 : 0,
    currentUser.id,
    id,
  ).run();

  const car = await getCarById(env, id);
  if (!car) return json({ success: false, error: "Автомобиль не найден." }, 404);
  return json({ success: true, car: toStaffCar(car) });
}

export function onRequest(): Response {
  return json({ success: false, error: "Используйте GET, POST или PATCH." }, 405, { allow: "GET, POST, PATCH" });
}
