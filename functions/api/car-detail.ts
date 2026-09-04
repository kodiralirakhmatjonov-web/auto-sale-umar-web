import { getAuthenticatedUser, json, type Env } from "../_lib/auth";
import { sanitizePublicVehicleText } from "../_lib/vin-privacy";

type CarStatus = "in_stock" | "in_showroom" | "in_transit" | "made_to_order" | "reserved" | "sold" | "hidden";
type Currency = "USD" | "UZS" | "EUR";

interface R2BucketLike {
  delete(key: string | string[]): Promise<void>;
}

type DetailEnv = Env & { MEDIA?: R2BucketLike };

interface D1ListResult<T> { results?: T[] }
interface D1ListStatementLike {
  bind(...values: unknown[]): D1ListStatementLike;
  all<T = Record<string, unknown>>(): Promise<D1ListResult<T>>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
}

interface CarDetailRow {
  id: number;
  slug: string;
  brand: string;
  model: string;
  trim: string | null;
  year: number | null;
  status: CarStatus;
  country_code: string | null;
  arrival_date: string | null;
  price: number | null;
  currency: Currency;
  price_on_request: number;
  mileage_km: number;
  is_new: number;
  is_public: number;
  is_featured: number;
  short_description_ru: string;
  short_description_uz: string;
  description_ru: string;
  description_uz: string;
  engine_text: string | null;
  fuel_type: string | null;
  drive_type: string | null;
  transmission: string | null;
  seats: number | null;
  engine_displacement_l: number | null;
  horsepower_hp: number | null;
  torque_nm: number | null;
  acceleration_0_100_s: number | null;
  top_speed_kmh: number | null;
  fuel_consumption_l_100km: number | null;
  electric_range_km: number | null;
  instagram_url: string | null;
}

interface VariantRow {
  id: number;
  exterior_color_name: string | null;
  interior_color_name: string | null;
  exterior_swatch: string | null;
  interior_swatch: string | null;
  vin: string | null;
  stock_number: string | null;
  quantity: number;
  sort_order: number;
}

interface MediaRow {
  id: number;
  variant_id: number;
  object_key: string;
  public_url: string;
  photo_group: "exterior" | "interior" | "detail";
  sort_order: number;
  is_cover: number;
}

interface UpdateVariantInput {
  id?: unknown;
  exteriorColorName?: unknown;
  exteriorSwatch?: unknown;
  interiorColorName?: unknown;
  interiorSwatch?: unknown;
  vin?: unknown;
  stockNumber?: unknown;
  quantity?: unknown;
}

interface UpdateCarBody {
  id?: unknown;
  brand?: unknown;
  model?: unknown;
  year?: unknown;
  trim?: unknown;
  status?: unknown;
  countryCode?: unknown;
  arrivalDate?: unknown;
  isNew?: unknown;
  mileageKm?: unknown;
  engineText?: unknown;
  engineDisplacementL?: unknown;
  fuelType?: unknown;
  driveType?: unknown;
  transmission?: unknown;
  seats?: unknown;
  horsepowerHp?: unknown;
  torqueNm?: unknown;
  acceleration0100?: unknown;
  topSpeedKmh?: unknown;
  fuelConsumptionL100?: unknown;
  electricRangeKm?: unknown;
  price?: unknown;
  currency?: unknown;
  priceOnRequest?: unknown;
  instagramUrl?: unknown;
  shortDescriptionRu?: unknown;
  shortDescriptionUz?: unknown;
  descriptionRu?: unknown;
  descriptionUz?: unknown;
  isPublic?: unknown;
  isFeatured?: unknown;
  variants?: unknown;
}

function text(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function nullableText(value: unknown, max = 500): string | null {
  const valueText = text(value, max);
  return valueText || null;
}

function integer(value: unknown, min: number, max: number): number | null | "invalid" {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : "invalid";
}

function numberValue(value: unknown, min: number, max: number): number | null | "invalid" {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : "invalid";
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function validStatus(value: string): value is CarStatus {
  return ["in_stock", "in_showroom", "in_transit", "made_to_order", "reserved", "sold", "hidden"].includes(value);
}

function validCountry(value: string): boolean {
  return !value || ["KR", "US", "CA", "AE", "AU", "EU", "DE", "GB", "JP", "CN", "SA", "QA", "CH"].includes(value);
}

function validCurrency(value: string): value is Currency {
  return ["USD", "UZS", "EUR"].includes(value);
}

function validIsoDate(value: string): boolean {
  return !value || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validVin(value: string | null): boolean {
  return !value || /^[A-HJ-NPR-Z0-9]{11,17}$/.test(value);
}

function normalizeInstagram(value: unknown): string | null | "invalid" {
  const raw = text(value, 500);
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

function fuelLabels(value: string | null) {
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

function transmissionLabels(value: string | null) {
  if (!value) return { ru: null, uz: null };
  const labels: Record<string, { ru: string; uz: string }> = {
    automatic: { ru: "Автомат", uz: "Avtomat" },
    robot: { ru: "Робот", uz: "Robot" },
    cvt: { ru: "Вариатор", uz: "Variator" },
    manual: { ru: "Механика", uz: "Mexanika" },
  };
  return labels[value] ?? { ru: value, uz: value };
}

function fuelInternal(value: string | null): string {
  if (!value) return "";
  const lower = value.toLowerCase();
  if (lower.includes("бенз") || lower.includes("benzin")) return "gasoline";
  if (lower.includes("диз") || lower.includes("diz")) return "diesel";
  if (lower.includes("plug") || lower.includes("подключ")) return "phev";
  if (lower.includes("гиб") || lower.includes("gibr")) return "hybrid";
  if (lower.includes("элект") || lower.includes("elektr")) return "electric";
  return value;
}

function transmissionInternal(value: string | null): string {
  if (!value) return "automatic";
  const lower = value.toLowerCase();
  if (lower.includes("робот")) return "robot";
  if (lower.includes("вариатор")) return "cvt";
  if (lower.includes("механ")) return "manual";
  return "automatic";
}

function hex(value: unknown, fallback: string): string {
  const normalized = text(value, 20).toLowerCase();
  return /^#[0-9a-f]{6}$/.test(normalized) ? normalized : fallback;
}

function slugify(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "brand";
}

async function ensureBrand(env: DetailEnv, brandName: string): Promise<number> {
  const existing = await env.DB.prepare(`SELECT id FROM brands WHERE lower(name) = lower(?1) LIMIT 1`).bind(brandName).first<{ id: number }>();
  if (existing?.id) return existing.id;
  const baseSlug = slugify(brandName);
  try {
    const inserted = await env.DB.prepare(`INSERT INTO brands (slug, name, is_active) VALUES (?1, ?2, 1) RETURNING id`).bind(baseSlug, brandName).first<{ id: number }>();
    if (inserted?.id) return inserted.id;
  } catch {
    const raced = await env.DB.prepare(`SELECT id FROM brands WHERE lower(name) = lower(?1) LIMIT 1`).bind(brandName).first<{ id: number }>();
    if (raced?.id) return raced.id;
  }
  const inserted = await env.DB.prepare(`INSERT INTO brands (slug, name, is_active) VALUES (?1, ?2, 1) RETURNING id`).bind(`${baseSlug}-${crypto.randomUUID().slice(0, 6)}`, brandName).first<{ id: number }>();
  if (!inserted?.id) throw new Error("Brand insert failed");
  return inserted.id;
}

async function requireAdmin(request: Request, env: DetailEnv) {
  if (!env.DB || !env.AUTH_PEPPER) return { response: json({ success: false, error: "Серверная конфигурация не завершена." }, 500), user: null };
  const user = await getAuthenticatedUser(request, env);
  if (!user) return { response: json({ success: false, error: "Требуется вход в систему." }, 401), user: null };
  if (user.role !== "super_admin" && user.role !== "admin" && user.role !== "sales_manager") return { response: json({ success: false, error: "Недостаточно прав для управления автомобилями." }, 403), user: null };
  return { response: null, user };
}

async function loadDetail(env: DetailEnv, id: number) {
  const car = await env.DB.prepare(`
    SELECT
      c.id, c.slug, b.name AS brand, c.model, c.trim, c.model_year AS year,
      c.status, c.source_country AS country_code, c.arrival_date,
      c.price_amount AS price, c.price_currency AS currency, c.price_on_request,
      c.mileage_km, c.is_new, c.is_published AS is_public, c.is_featured,
      c.short_description_ru, c.short_description_uz, c.description_ru, c.description_uz,
      s.engine_name AS engine_text, s.fuel_type_ru AS fuel_type,
      s.drivetrain_ru AS drive_type, s.transmission_ru AS transmission, s.seats,
      p.engine_displacement_l, p.horsepower_hp, p.torque_nm,
      p.acceleration_0_100_s, p.top_speed_kmh, p.fuel_consumption_l_100km, p.electric_range_km,
      l.instagram_url
    FROM cars c
    INNER JOIN brands b ON b.id = c.brand_id
    LEFT JOIN car_specs s ON s.car_id = c.id
    LEFT JOIN car_performance p ON p.car_id = c.id
    LEFT JOIN car_links l ON l.car_id = c.id
    WHERE c.id = ?1
    LIMIT 1
  `).bind(id).first<CarDetailRow>();

  if (!car) return null;

  const variantResult = await (env.DB.prepare(`
    SELECT
      v.id,
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
    WHERE v.car_id = ?1
    ORDER BY v.sort_order ASC, v.id ASC
  `) as unknown as D1ListStatementLike).bind(id).all<VariantRow>();

  const mediaResult = await (env.DB.prepare(`
    SELECT id, variant_id, object_key, public_url,
      CASE WHEN object_key LIKE '%/detail/%' THEN 'detail' ELSE photo_group END AS photo_group,
      sort_order, is_cover
    FROM car_variant_media
    WHERE car_id = ?1
    ORDER BY variant_id ASC, photo_group ASC, sort_order ASC, id ASC
  `) as unknown as D1ListStatementLike).bind(id).all<MediaRow>();

  const media = Array.isArray(mediaResult.results) ? mediaResult.results : [];
  const variants = (Array.isArray(variantResult.results) ? variantResult.results : []).map((variant) => ({
    id: variant.id,
    exteriorColorName: variant.exterior_color_name === "Не указан" ? "" : (variant.exterior_color_name ?? ""),
    exteriorSwatch: variant.exterior_swatch || "#111214",
    interiorColorName: variant.interior_color_name ?? "",
    interiorSwatch: variant.interior_swatch || "#111214",
    vin: variant.vin ?? "",
    stockNumber: variant.stock_number ?? "",
    quantity: variant.quantity || 1,
    exteriorPhotos: media.filter((item) => item.variant_id === variant.id && item.photo_group === "exterior").map((item) => ({
      id: item.id, publicUrl: item.public_url, objectKey: item.object_key, isCover: item.is_cover === 1, sortOrder: item.sort_order,
    })),
    interiorPhotos: media.filter((item) => item.variant_id === variant.id && item.photo_group === "interior").map((item) => ({
      id: item.id, publicUrl: item.public_url, objectKey: item.object_key, isCover: item.is_cover === 1, sortOrder: item.sort_order,
    })),
    detailPhotos: media.filter((item) => item.variant_id === variant.id && item.photo_group === "detail").map((item) => ({
      id: item.id, publicUrl: item.public_url, objectKey: item.object_key, isCover: item.is_cover === 1, sortOrder: item.sort_order,
    })),
  }));

  return {
    id: car.id,
    slug: car.slug,
    brand: car.brand,
    model: car.model,
    year: car.year,
    trim: car.trim ?? "",
    status: car.status,
    countryCode: car.country_code ?? "KR",
    arrivalDate: car.arrival_date ?? "",
    isNew: car.is_new === 1,
    mileageKm: car.mileage_km ?? 0,
    engineText: car.engine_text ?? "",
    engineDisplacementL: car.engine_displacement_l,
    fuelType: fuelInternal(car.fuel_type),
    driveType: car.drive_type ?? "",
    transmission: transmissionInternal(car.transmission),
    seats: car.seats,
    horsepowerHp: car.horsepower_hp,
    torqueNm: car.torque_nm,
    acceleration0100: car.acceleration_0_100_s,
    topSpeedKmh: car.top_speed_kmh,
    fuelConsumptionL100: car.fuel_consumption_l_100km,
    electricRangeKm: car.electric_range_km,
    price: car.price,
    currency: car.currency,
    priceOnRequest: car.price_on_request === 1,
    instagramUrl: car.instagram_url ?? "",
    shortDescriptionRu: car.short_description_ru ?? "",
    shortDescriptionUz: car.short_description_uz ?? "",
    descriptionRu: car.description_ru ?? "",
    descriptionUz: car.description_uz ?? "",
    isPublic: car.is_public === 1,
    isFeatured: car.is_featured === 1,
    variants,
  };
}

export async function onRequestGet(context: { request: Request; env: DetailEnv }): Promise<Response> {
  const auth = await requireAdmin(context.request, context.env);
  if (auth.response) return auth.response;
  const url = new URL(context.request.url);
  const id = integer(url.searchParams.get("id"), 1, 2_000_000_000);
  if (id === "invalid" || id == null) return json({ success: false, error: "Некорректный ID автомобиля." }, 400);
  try {
    const car = await loadDetail(context.env, id);
    if (!car) return json({ success: false, error: "Автомобиль не найден." }, 404);
    return json({ success: true, car });
  } catch (error) {
    console.error("Car detail load failed", error);
    return json({ success: false, error: "Не удалось загрузить данные автомобиля." }, 500);
  }
}

export async function onRequestPatch(context: { request: Request; env: DetailEnv }): Promise<Response> {
  const { request, env } = context;
  const auth = await requireAdmin(request, env);
  if (auth.response || !auth.user) return auth.response!;

  let body: UpdateCarBody;
  try { body = await request.json() as UpdateCarBody; }
  catch { return json({ success: false, error: "Некорректный JSON-запрос." }, 400); }

  const id = integer(body.id, 1, 2_000_000_000);
  if (id === "invalid" || id == null) return json({ success: false, error: "Некорректный ID автомобиля." }, 400);

  const existing = await env.DB.prepare(`SELECT id FROM cars WHERE id = ?1 LIMIT 1`).bind(id).first<{ id: number }>();
  if (!existing) return json({ success: false, error: "Автомобиль не найден." }, 404);

  const brand = text(body.brand, 80);
  const model = text(body.model, 100);
  const trim = nullableText(body.trim, 120);
  const status = text(body.status, 30);
  const countryCode = text(body.countryCode, 10).toUpperCase();
  const rawArrivalDate = text(body.arrivalDate, 10);
  const arrivalDate = ["in_transit", "made_to_order", "reserved"].includes(status) ? rawArrivalDate : "";
  const currencyText = text(body.currency, 10).toUpperCase() || "USD";

  if (!brand || !model) return json({ success: false, error: "Укажите марку и модель автомобиля." }, 400);
  if (!validStatus(status)) return json({ success: false, error: "Некорректный статус автомобиля." }, 400);
  if (!validCountry(countryCode)) return json({ success: false, error: "Некорректная страна поставки." }, 400);
  if (!validIsoDate(arrivalDate)) return json({ success: false, error: "Проверьте дату прибытия." }, 400);
  if (!validCurrency(currencyText)) return json({ success: false, error: "Некорректная валюта." }, 400);

  const year = integer(body.year, 1900, 2100);
  const mileageKm = integer(body.mileageKm, 0, 20_000_000);
  const seats = integer(body.seats, 1, 99);
  const horsepowerHp = integer(body.horsepowerHp, 1, 5000);
  const torqueNm = integer(body.torqueNm, 1, 10000);
  const topSpeedKmh = integer(body.topSpeedKmh, 1, 1000);
  const electricRangeKm = integer(body.electricRangeKm, 1, 5000);
  const price = integer(body.price, 0, 9_000_000_000_000);
  const engineDisplacementL = numberValue(body.engineDisplacementL, 0.1, 20);
  const acceleration0100 = numberValue(body.acceleration0100, 0.5, 60);
  const fuelConsumptionL100 = numberValue(body.fuelConsumptionL100, 0.1, 100);
  if ([year, mileageKm, seats, horsepowerHp, torqueNm, topSpeedKmh, electricRangeKm, price, engineDisplacementL, acceleration0100, fuelConsumptionL100].includes("invalid")) {
    return json({ success: false, error: "Проверьте числовые характеристики автомобиля." }, 400);
  }

  const instagramUrl = normalizeInstagram(body.instagramUrl);
  if (instagramUrl === "invalid") return json({ success: false, error: "Проверьте ссылку Instagram." }, 400);

  const variantInputs = Array.isArray(body.variants) ? body.variants as UpdateVariantInput[] : [];
  if (variantInputs.length < 1 || variantInputs.length > 30) return json({ success: false, error: "Добавьте хотя бы один цветовой вариант." }, 400);

  const variants = [] as Array<{
    id: number | null; exteriorColorName: string | null; exteriorSwatch: string; interiorColorName: string | null;
    interiorSwatch: string; vin: string | null; stockNumber: string | null; quantity: number;
  }>;
  for (const item of variantInputs) {
    const variantId = integer(item.id, 1, 2_000_000_000);
    const quantity = integer(item.quantity, 1, 99);
    if (variantId === "invalid" || quantity === "invalid" || quantity == null) return json({ success: false, error: "Проверьте цветовые варианты." }, 400);
    const vin = nullableText(item.vin, 32)?.toUpperCase() ?? null;
    if (!validVin(vin)) return json({ success: false, error: "Проверьте VIN." }, 400);
    variants.push({
      id: variantId,
      exteriorColorName: nullableText(item.exteriorColorName, 120),
      exteriorSwatch: hex(item.exteriorSwatch, "#111214"),
      interiorColorName: nullableText(item.interiorColorName, 120),
      interiorSwatch: hex(item.interiorSwatch, "#111214"),
      vin,
      stockNumber: nullableText(item.stockNumber, 80),
      quantity,
    });
  }

  const seenVin = new Set<string>();
  const seenStock = new Set<string>();
  for (const variant of variants) {
    if (variant.vin) {
      if (seenVin.has(variant.vin)) return json({ success: false, error: "Один VIN указан дважды." }, 400);
      seenVin.add(variant.vin);
      const duplicate = await env.DB.prepare(`
        SELECT inv.variant_id FROM car_variant_inventory inv
        INNER JOIN car_variants v ON v.id = inv.variant_id
        WHERE inv.vin = ?1 COLLATE NOCASE AND v.car_id <> ?2 LIMIT 1
      `).bind(variant.vin, id).first<{ variant_id: number }>();
      if (duplicate) return json({ success: false, error: `VIN ${variant.vin} уже используется.` }, 409);
    }
    if (variant.stockNumber) {
      if (seenStock.has(variant.stockNumber)) return json({ success: false, error: "Один внутренний номер указан дважды." }, 400);
      seenStock.add(variant.stockNumber);
      const duplicate = await env.DB.prepare(`
        SELECT inv.variant_id FROM car_variant_inventory inv
        INNER JOIN car_variants v ON v.id = inv.variant_id
        WHERE inv.stock_number = ?1 AND v.car_id <> ?2 LIMIT 1
      `).bind(variant.stockNumber, id).first<{ variant_id: number }>();
      if (duplicate) return json({ success: false, error: `Внутренний номер ${variant.stockNumber} уже используется.` }, 409);
    }
  }

  const isNew = bool(body.isNew, (mileageKm ?? 0) === 0);
  const priceOnRequest = bool(body.priceOnRequest, price == null) || price == null;
  const finalPrice = priceOnRequest ? null : price;
  const isPublic = bool(body.isPublic, false);
  const isFeatured = bool(body.isFeatured, false);

  if (isPublic) {
    const cover = await env.DB.prepare(`SELECT id FROM car_variant_media WHERE car_id = ?1 AND photo_group = 'exterior' LIMIT 1`).bind(id).first<{ id: number }>();
    if (!cover) return json({ success: false, error: "Для публикации добавьте хотя бы одну фотографию кузова." }, 400);
  }

  const engineText = nullableText(body.engineText, 180);
  const fuelType = nullableText(body.fuelType, 80);
  const driveType = nullableText(body.driveType, 80);
  const transmission = nullableText(body.transmission, 80) ?? "automatic";
  const fuel = fuelLabels(fuelType);
  const trans = transmissionLabels(transmission);
  const brandId = await ensureBrand(env, brand);

  const firstVariant = variants[0];
  const submittedVins = variants.map((variant) => variant.vin);
  const shortRuRaw = nullableText(body.shortDescriptionRu, 220) ?? `${brand} ${model}`;
  const shortUzRaw = nullableText(body.shortDescriptionUz, 220) ?? `${brand} ${model}`;
  const descRuRaw = nullableText(body.descriptionRu, 10_000) ?? shortRuRaw;
  const descUzRaw = nullableText(body.descriptionUz, 10_000) ?? shortUzRaw;
  const shortRu = sanitizePublicVehicleText(shortRuRaw, submittedVins) || `${brand} ${model}`;
  const shortUz = sanitizePublicVehicleText(shortUzRaw, submittedVins) || `${brand} ${model}`;
  const descRu = sanitizePublicVehicleText(descRuRaw, submittedVins) || shortRu;
  const descUz = sanitizePublicVehicleText(descUzRaw, submittedVins) || shortUz;

  try {
    await env.DB.prepare(`
      UPDATE cars SET
        brand_id = ?1, model = ?2, trim = ?3, model_year = ?4,
        vin = ?5, stock_number = ?6,
        short_description_ru = ?7, short_description_uz = ?8,
        description_ru = ?9, description_uz = ?10,
        price_amount = ?11, price_currency = ?12, price_on_request = ?13,
        status = ?14, source_country = ?15, arrival_date = ?16,
        mileage_km = ?17, is_new = ?18, is_featured = ?19, is_published = ?20,
        updated_by = ?21, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?22
    `).bind(
      brandId, model, trim, year, firstVariant.vin, firstVariant.stockNumber,
      shortRu, shortUz, descRu, descUz,
      finalPrice, currencyText, priceOnRequest ? 1 : 0,
      status, countryCode || null, arrivalDate || null,
      isNew ? 0 : (mileageKm ?? 0), isNew ? 1 : 0, isFeatured ? 1 : 0, isPublic ? 1 : 0,
      auth.user.id, id,
    ).run();

    const hasSpecs = Boolean(engineText || fuel.ru || trans.ru || driveType || seats);
    if (hasSpecs) {
      const specsExists = await env.DB.prepare(`SELECT car_id FROM car_specs WHERE car_id = ?1 LIMIT 1`).bind(id).first<{ car_id: number }>();
      if (specsExists) {
        await env.DB.prepare(`
          UPDATE car_specs SET
            engine_name = ?1,
            fuel_type_ru = ?2,
            fuel_type_uz = ?3,
            transmission_ru = ?4,
            transmission_uz = ?5,
            drivetrain_ru = ?6,
            drivetrain_uz = ?7,
            seats = ?8
          WHERE car_id = ?9
        `).bind(engineText, fuel.ru, fuel.uz, trans.ru, trans.uz, driveType, driveType, seats, id).run();
      } else {
        await env.DB.prepare(`
          INSERT INTO car_specs (car_id, engine_name, fuel_type_ru, fuel_type_uz, transmission_ru, transmission_uz, drivetrain_ru, drivetrain_uz, seats)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
        `).bind(id, engineText, fuel.ru, fuel.uz, trans.ru, trans.uz, driveType, driveType, seats).run();
      }
    } else {
      await env.DB.prepare(`DELETE FROM car_specs WHERE car_id = ?1`).bind(id).run();
    }

    const hasPerformance = [engineDisplacementL, horsepowerHp, torqueNm, acceleration0100, topSpeedKmh, fuelConsumptionL100, electricRangeKm].some((item) => item != null);
    if (hasPerformance) {
      await env.DB.prepare(`
        INSERT INTO car_performance (car_id, engine_displacement_l, horsepower_hp, torque_nm, acceleration_0_100_s, top_speed_kmh, fuel_consumption_l_100km, electric_range_km, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, CURRENT_TIMESTAMP)
        ON CONFLICT(car_id) DO UPDATE SET
          engine_displacement_l = excluded.engine_displacement_l,
          horsepower_hp = excluded.horsepower_hp,
          torque_nm = excluded.torque_nm,
          acceleration_0_100_s = excluded.acceleration_0_100_s,
          top_speed_kmh = excluded.top_speed_kmh,
          fuel_consumption_l_100km = excluded.fuel_consumption_l_100km,
          electric_range_km = excluded.electric_range_km,
          updated_at = CURRENT_TIMESTAMP
      `).bind(id, engineDisplacementL, horsepowerHp, torqueNm, acceleration0100, topSpeedKmh, fuelConsumptionL100, electricRangeKm).run();
    } else {
      await env.DB.prepare(`DELETE FROM car_performance WHERE car_id = ?1`).bind(id).run();
    }

    if (instagramUrl) {
      await env.DB.prepare(`
        INSERT INTO car_links (car_id, instagram_url, updated_at)
        VALUES (?1, ?2, CURRENT_TIMESTAMP)
        ON CONFLICT(car_id) DO UPDATE SET instagram_url = excluded.instagram_url, updated_at = CURRENT_TIMESTAMP
      `).bind(id, instagramUrl).run();
    } else {
      await env.DB.prepare(`DELETE FROM car_links WHERE car_id = ?1`).bind(id).run();
    }

    const existingVariantResult = await (env.DB.prepare(`SELECT id FROM car_variants WHERE car_id = ?1`) as unknown as D1ListStatementLike).bind(id).all<{ id: number }>();
    const existingIds = new Set((existingVariantResult.results ?? []).map((row) => row.id));
    const keptIds = new Set<number>();
    const savedVariants: Array<{ id: number; index: number }> = [];

    for (let index = 0; index < variants.length; index += 1) {
      const variant = variants[index];
      let variantId = variant.id;
      if (variantId != null) {
        if (!existingIds.has(variantId)) return json({ success: false, error: "Один из цветовых вариантов больше не существует." }, 409);
        await env.DB.prepare(`
          UPDATE car_variants SET
            color_name_ru = ?1, color_name_uz = ?2,
            interior_color_ru = ?3, interior_color_uz = ?4,
            quantity = ?5, is_default = ?6, sort_order = ?7
          WHERE id = ?8 AND car_id = ?9
        `).bind(
          variant.exteriorColorName ?? "Не указан", variant.exteriorColorName ?? "Ko‘rsatilmagan",
          variant.interiorColorName, variant.interiorColorName,
          variant.quantity, index === 0 ? 1 : 0, index, variantId, id,
        ).run();
      } else {
        const inserted = await env.DB.prepare(`
          INSERT INTO car_variants (car_id, color_name_ru, color_name_uz, interior_color_ru, interior_color_uz, quantity, is_default, sort_order)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8) RETURNING id
        `).bind(
          id, variant.exteriorColorName ?? "Не указан", variant.exteriorColorName ?? "Ko‘rsatilmagan",
          variant.interiorColorName, variant.interiorColorName,
          variant.quantity, index === 0 ? 1 : 0, index,
        ).first<{ id: number }>();
        if (!inserted?.id) throw new Error("Variant insert failed");
        variantId = inserted.id;
      }

      keptIds.add(variantId);
      await env.DB.prepare(`
        INSERT INTO car_variant_style (variant_id, exterior_swatch, interior_swatch)
        VALUES (?1, ?2, ?3)
        ON CONFLICT(variant_id) DO UPDATE SET exterior_swatch = excluded.exterior_swatch, interior_swatch = excluded.interior_swatch
      `).bind(variantId, variant.exteriorSwatch, variant.interiorSwatch).run();

      await env.DB.prepare(`
        INSERT INTO car_variant_inventory (variant_id, vin, stock_number, quantity, updated_at)
        VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)
        ON CONFLICT(variant_id) DO UPDATE SET vin = excluded.vin, stock_number = excluded.stock_number, quantity = excluded.quantity, updated_at = CURRENT_TIMESTAMP
      `).bind(variantId, variant.vin, variant.stockNumber, variant.quantity).run();

      savedVariants.push({ id: variantId, index });
    }

    const removedIds = [...existingIds].filter((variantId) => !keptIds.has(variantId));
    for (const removedId of removedIds) {
      const mediaResult = await (env.DB.prepare(`SELECT object_key FROM car_variant_media WHERE car_id = ?1 AND variant_id = ?2`) as unknown as D1ListStatementLike).bind(id, removedId).all<{ object_key: string }>();
      const keys = (mediaResult.results ?? []).map((row) => row.object_key).filter(Boolean);
      await env.DB.prepare(`DELETE FROM car_variants WHERE id = ?1 AND car_id = ?2`).bind(removedId, id).run();
      if (env.MEDIA && keys.length > 0) {
        try { await env.MEDIA.delete(keys); } catch (mediaError) { console.error("Removed variant R2 cleanup failed", mediaError); }
      }
    }

    const car = await loadDetail(env, id);
    return json({ success: true, message: "Изменения сохранены.", car, variants: savedVariants });
  } catch (error) {
    console.error("Car detail update failed", error);
    return json({ success: false, error: "Не удалось сохранить изменения автомобиля." }, 500);
  }
}

export function onRequest(): Response {
  return json({ success: false, error: "Используйте GET или PATCH." }, 405, { allow: "GET, PATCH" });
}
