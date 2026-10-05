import { getAuthenticatedUser, json, type Env } from "../_lib/auth";
import { deleteDisplayMediaSetting, ensureDisplayMediaSettings, setDisplayCover, setDisplayFlip } from "../_lib/display-media";

interface R2ObjectBodyLike {
  body: ReadableStream<Uint8Array>;
  httpEtag?: string;
  httpMetadata?: {
    contentType?: string;
    cacheControl?: string;
  };
  writeHttpMetadata?(headers: Headers): void;
}

interface R2BucketLike {
  put(
    key: string,
    value: ReadableStream<Uint8Array> | ArrayBuffer | Blob,
    options?: {
      httpMetadata?: { contentType?: string; cacheControl?: string };
      customMetadata?: Record<string, string>;
    },
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectBodyLike | null>;
  delete(key: string): Promise<void>;
}

type MediaEnv = Env & { MEDIA: R2BucketLike };

type PhotoGroup = "exterior" | "interior" | "detail";

interface UpdateMediaBody {
  id?: unknown;
  isDisplayCover?: unknown;
  displayFlipHorizontal?: unknown;
}

function cleanKey(value: string): string | null {
  const key = value.trim();
  if (!key || key.length > 700 || key.includes("..") || !key.startsWith("cars/")) return null;
  return key;
}

function integerField(form: FormData, name: string, min: number, max: number): number | null {
  const raw = form.get(name);
  if (typeof raw !== "string" || !raw.trim()) return null;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

function boolFromUnknown(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function extensionFor(file: File): string {
  const type = file.type.toLowerCase();
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/avif") return "avif";
  if (type === "image/heic" || type === "image/heif") return "heic";
  const fromName = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  return fromName?.slice(0, 8) || "img";
}

export async function onRequestGet(context: {
  request: Request;
  env: MediaEnv;
}): Promise<Response> {
  const { request, env } = context;
  if (!env.MEDIA) return new Response("Media unavailable", { status: 503 });

  const url = new URL(request.url);
  const key = cleanKey(url.searchParams.get("key") ?? "");
  if (!key) return new Response("Not found", { status: 404 });

  const object = await env.MEDIA.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  if (typeof object.writeHttpMetadata === "function") object.writeHttpMetadata(headers);
  if (!headers.has("content-type") && object.httpMetadata?.contentType) {
    headers.set("content-type", object.httpMetadata.contentType);
  }
  headers.set("cache-control", object.httpMetadata?.cacheControl || "public, max-age=31536000, immutable");
  if (object.httpEtag) headers.set("etag", object.httpEtag);
  headers.set("x-content-type-options", "nosniff");

  return new Response(object.body, { headers });
}

export async function onRequestPost(context: {
  request: Request;
  env: MediaEnv;
}): Promise<Response> {
  const { request, env } = context;
  if (!env.DB || !env.AUTH_PEPPER || !env.MEDIA) {
    return json({ success: false, error: "D1 или R2 MEDIA не подключены." }, 500);
  }

  const currentUser = await getAuthenticatedUser(request, env);
  if (!currentUser) return json({ success: false, error: "Требуется вход в систему." }, 401);
  if (currentUser.role !== "super_admin" && currentUser.role !== "admin" && currentUser.role !== "sales_manager") {
    return json({ success: false, error: "Недостаточно прав для загрузки фотографий." }, 403);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ success: false, error: "Некорректная форма загрузки." }, 400);
  }

  const carId = integerField(form, "carId", 1, 2_000_000_000);
  const variantId = integerField(form, "variantId", 1, 2_000_000_000);
  const sortOrder = integerField(form, "sortOrder", 0, 1000) ?? 0;
  const groupRaw = form.get("group");
  const group: PhotoGroup | null = groupRaw === "exterior" || groupRaw === "interior" || groupRaw === "detail" ? groupRaw : null;
  const isCover = form.get("isCover") === "1";
  const fileValue = form.get("file");

  if (!carId || !variantId || !group || !(fileValue instanceof File)) {
    return json({ success: false, error: "Не хватает данных фотографии." }, 400);
  }

  const file = fileValue;
  if (!file.type.startsWith("image/")) return json({ success: false, error: "Разрешены только изображения." }, 400);
  if (file.size <= 0 || file.size > 20 * 1024 * 1024) {
    return json({ success: false, error: "Размер одной фотографии должен быть до 20 МБ." }, 400);
  }

  const variant = await env.DB.prepare(
    `SELECT id FROM car_variants WHERE id = ?1 AND car_id = ?2 LIMIT 1`,
  ).bind(variantId, carId).first<{ id: number }>();
  if (!variant) return json({ success: false, error: "Цветовой вариант не найден." }, 404);

  const extension = extensionFor(file);
  const objectKey = `cars/${carId}/${variantId}/${group}/${crypto.randomUUID()}.${extension}`;
  const publicUrl = `/api/car-media?key=${encodeURIComponent(objectKey)}`;
  // Keep D1 compatible with older schemas that only allow exterior/interior.
  // Detail media is distinguished by the immutable R2 object path `/detail/`.
  const dbPhotoGroup = group === "detail" ? "interior" : group;

  try {
    await env.MEDIA.put(objectKey, file.stream() as ReadableStream<Uint8Array>, {
      httpMetadata: {
        contentType: file.type || "application/octet-stream",
        cacheControl: "public, max-age=31536000, immutable",
      },
      customMetadata: {
        carId: String(carId),
        variantId: String(variantId),
        group,
      },
    });

    if (isCover) {
      await env.DB.prepare(`UPDATE car_variant_media SET is_cover = 0 WHERE car_id = ?1`).bind(carId).run();
    }

    const inserted = await env.DB.prepare(
      `INSERT INTO car_variant_media (
        car_id, variant_id, object_key, public_url, photo_group,
        sort_order, is_cover, mime_type, file_size, created_by
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
      RETURNING id`,
    ).bind(
      carId,
      variantId,
      objectKey,
      publicUrl,
      dbPhotoGroup,
      sortOrder,
      isCover ? 1 : 0,
      file.type || null,
      file.size,
      currentUser.id,
    ).first<{ id: number }>();

    if (!inserted?.id) throw new Error("D1 did not return media id.");

    return json({
      success: true,
      media: {
        id: inserted.id,
        carId,
        variantId,
        group,
        publicUrl,
        isCover,
        isDisplayCover: false,
        displayFlipHorizontal: false,
      },
    }, 201);
  } catch (error) {
    console.error("Car media upload failed", error);
    try { await env.MEDIA.delete(objectKey); } catch {}
    return json({ success: false, error: "Не удалось сохранить фотографию в R2/D1. Проверьте миграцию 0002." }, 500);
  }
}



export async function onRequestPatch(context: {
  request: Request;
  env: MediaEnv;
}): Promise<Response> {
  const { request, env } = context;
  if (!env.DB || !env.AUTH_PEPPER || !env.MEDIA) {
    return json({ success: false, error: "D1 или R2 MEDIA не подключены." }, 500);
  }

  const currentUser = await getAuthenticatedUser(request, env);
  if (!currentUser) return json({ success: false, error: "Требуется вход в систему." }, 401);
  if (currentUser.role !== "super_admin" && currentUser.role !== "admin" && currentUser.role !== "sales_manager") {
    return json({ success: false, error: "Недостаточно прав для изменения фотографий." }, 403);
  }

  let body: UpdateMediaBody;
  try {
    body = await request.json() as UpdateMediaBody;
  } catch {
    return json({ success: false, error: "Некорректный JSON-запрос." }, 400);
  }

  const id = typeof body.id === "number" ? body.id : Number(body.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return json({ success: false, error: "Некорректный ID фотографии." }, 400);
  }

  const isDisplayCover = boolFromUnknown(body.isDisplayCover);
  const displayFlipHorizontal = boolFromUnknown(body.displayFlipHorizontal);
  if (isDisplayCover == null && displayFlipHorizontal == null) {
    return json({ success: false, error: "Нет изменений для сохранения." }, 400);
  }

  await ensureDisplayMediaSettings(env);
  const media = await env.DB.prepare(
    `SELECT m.id, m.car_id, m.variant_id, m.photo_group,
      COALESCE(ds.is_display_cover, 0) AS is_display_cover,
      COALESCE(ds.display_flip_horizontal, 0) AS display_flip_horizontal
     FROM car_variant_media m
     LEFT JOIN car_display_media_settings ds ON ds.media_id = m.id
     WHERE m.id = ?1
     LIMIT 1`,
  ).bind(id).first<{
    id: number;
    car_id: number;
    variant_id: number;
    photo_group: string;
    is_display_cover: number;
    display_flip_horizontal: number;
  }>();

  if (!media) return json({ success: false, error: "Фотография не найдена." }, 404);

  if (isDisplayCover != null && media.photo_group !== "exterior") {
    return json({ success: false, error: "Вторая TV-обложка доступна только для фотографий кузова." }, 400);
  }

  try {
    if (isDisplayCover != null) {
      await setDisplayCover(env, id, media.car_id, isDisplayCover);
    }

    if (displayFlipHorizontal != null) {
      await setDisplayFlip(env, id, media.car_id, displayFlipHorizontal);
    }

    const updated = await env.DB.prepare(
      `SELECT m.id, m.car_id, m.variant_id, m.public_url, m.photo_group, m.is_cover,
        COALESCE(ds.is_display_cover, 0) AS is_display_cover,
        COALESCE(ds.display_flip_horizontal, 0) AS display_flip_horizontal,
        m.sort_order
       FROM car_variant_media m
       LEFT JOIN car_display_media_settings ds ON ds.media_id = m.id
       WHERE m.id = ?1
       LIMIT 1`,
    ).bind(id).first<{
      id: number;
      car_id: number;
      variant_id: number;
      public_url: string;
      photo_group: string;
      is_cover: number;
      is_display_cover: number;
      display_flip_horizontal: number;
      sort_order: number;
    }>();

    return json({
      success: true,
      media: updated ? {
        id: updated.id,
        carId: updated.car_id,
        variantId: updated.variant_id,
        publicUrl: updated.public_url,
        group: updated.photo_group,
        isCover: updated.is_cover === 1,
        isDisplayCover: updated.is_display_cover === 1,
        displayFlipHorizontal: updated.display_flip_horizontal === 1,
        sortOrder: updated.sort_order,
      } : null,
    });
  } catch (error) {
    console.error("Car media patch failed", error);
    return json({ success: false, error: "Не удалось обновить фотографию." }, 500);
  }
}

export async function onRequestDelete(context: {
  request: Request;
  env: MediaEnv;
}): Promise<Response> {
  const { request, env } = context;
  if (!env.DB || !env.AUTH_PEPPER || !env.MEDIA) {
    return json({ success: false, error: "D1 или R2 MEDIA не подключены." }, 500);
  }

  const currentUser = await getAuthenticatedUser(request, env);
  if (!currentUser) return json({ success: false, error: "Требуется вход в систему." }, 401);
  if (currentUser.role !== "super_admin" && currentUser.role !== "admin" && currentUser.role !== "sales_manager") {
    return json({ success: false, error: "Недостаточно прав для удаления фотографий." }, 403);
  }

  const url = new URL(request.url);
  const idRaw = url.searchParams.get("id");
  const id = idRaw ? Number(idRaw) : Number.NaN;
  if (!Number.isSafeInteger(id) || id < 1) {
    return json({ success: false, error: "Некорректный ID фотографии." }, 400);
  }

  const media = await env.DB.prepare(
    `SELECT id, car_id, object_key, is_cover FROM car_variant_media WHERE id = ?1 LIMIT 1`,
  ).bind(id).first<{ id: number; car_id: number; object_key: string; is_cover: number }>();
  if (!media) return json({ success: false, error: "Фотография не найдена." }, 404);

  try {
    await deleteDisplayMediaSetting(env, id);
    await env.DB.prepare(`DELETE FROM car_variant_media WHERE id = ?1`).bind(id).run();
    await env.MEDIA.delete(media.object_key);

    if (media.is_cover === 1) {
      const nextCover = await env.DB.prepare(
        `SELECT id FROM car_variant_media WHERE car_id = ?1 AND photo_group = 'exterior' ORDER BY sort_order ASC, id ASC LIMIT 1`,
      ).bind(media.car_id).first<{ id: number }>();
      if (nextCover?.id) {
        await env.DB.prepare(`UPDATE car_variant_media SET is_cover = 1 WHERE id = ?1`).bind(nextCover.id).run();
      }
    }

    return json({ success: true, deletedId: id });
  } catch (error) {
    console.error("Car media delete failed", error);
    return json({ success: false, error: "Не удалось удалить фотографию." }, 500);
  }
}

export function onRequest(): Response {
  return json({ success: false, error: "Используйте GET, POST, PATCH или DELETE." }, 405, { allow: "GET, POST, PATCH, DELETE" });
}
