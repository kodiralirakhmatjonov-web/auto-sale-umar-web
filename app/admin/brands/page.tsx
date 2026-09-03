"use client";

import { ImagePlus, Trash2, Upload } from "lucide-react";
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminChrome, { type AdminRole } from "../_components/AdminChrome";
import { compressImageForUpload } from "../../_lib/compress-image";
import styles from "./brands.module.css";

type Language = "ru" | "uz";
type Theme = "light" | "dark";

interface CarItem {
  id: number;
  brand: string;
}

interface CarsResponse {
  success?: boolean;
  error?: string;
  cars?: CarItem[];
  viewer?: { role?: "super_admin" | "admin" | "sales_manager" };
}

interface CoverItem {
  key: string;
  url: string;
  size: number;
  uploadedAt: string | null;
}

interface BrandMediaResponse {
  success?: boolean;
  error?: string;
  maxCovers?: number;
  images?: CoverItem[];
  image?: CoverItem;
}

const KNOWN_BRANDS = [
  "Mercedes-Benz",
  "Range Rover",
  "Rolls-Royce",
  "Cadillac",
  "Lexus",
  "Toyota",
  "Genesis",
  "BMW",
  "Lamborghini",
  "Porsche",
] as const;

const LOGOS: Record<string, string> = {
  "Mercedes-Benz": "/brands/mercedes-benz.jpg",
  "Range Rover": "/brands/range-rover.png",
  "Rolls-Royce": "/brands/rolls-royce.png",
  Cadillac: "/brands/cadillac.png",
  Lexus: "/brands/lexus.png",
  Toyota: "/brands/toyota.png",
  Genesis: "/brands/genesis.png",
  BMW: "/brands/bmw.png",
  Lamborghini: "/brands/lamborghini.png",
  Porsche: "/brands/porsche.png",
};

const COPY = {
  ru: {
    eyebrow: "AUTO SALE UMAR / CONTROL SYSTEM",
    title: "Обложки марок",
    lead: "Загрузите до трёх атмосферных изображений для каждой марки. Они автоматически появятся в верхней обложке всех автомобилей этой марки.",
    choose: "Выберите марку",
    covers: "Обложки",
    coverHint: "JPG, PNG, WebP или AVIF · до 20 МБ · максимум 3 изображения.",
    upload: "Добавить обложку",
    uploading: "Загружаем…",
    empty: "Обложки ещё не добавлены",
    emptyText: "Пока используется стандартная системная заставка марки.",
    delete: "Удалить",
    denied: "У вашей роли нет доступа к управлению обложками марок.",
    loadError: "Не удалось загрузить данные марок.",
    coverError: "Не удалось загрузить обложки марки.",
    uploadError: "Не удалось загрузить изображение.",
    deleteError: "Не удалось удалить изображение.",
  },
  uz: {
    eyebrow: "AUTO SALE UMAR / CONTROL SYSTEM",
    title: "Marka muqovalari",
    lead: "Har bir marka uchun uchtagacha atmosfera tasvirini yuklang. Ular shu markadagi barcha avtomobillarning yuqori muqovasida avtomatik ko‘rinadi.",
    choose: "Markani tanlang",
    covers: "Muqovalar",
    coverHint: "JPG, PNG, WebP yoki AVIF · 20 MB gacha · ko‘pi bilan 3 ta rasm.",
    upload: "Muqova qo‘shish",
    uploading: "Yuklanmoqda…",
    empty: "Muqovalar hali qo‘shilmagan",
    emptyText: "Hozircha markaning standart tizim zastavkasi ishlatiladi.",
    delete: "O‘chirish",
    denied: "Sizning rolingiz marka muqovalarini boshqarishga ruxsat bermaydi.",
    loadError: "Markalar ma’lumotini yuklab bo‘lmadi.",
    coverError: "Marka muqovalarini yuklab bo‘lmadi.",
    uploadError: "Rasmni yuklab bo‘lmadi.",
    deleteError: "Rasmni o‘chirib bo‘lmadi.",
  },
} as const;

function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const mb = bytes / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

export default function AdminBrandsPage() {
  const [language, setLanguage] = useState<Language>("ru");
  const [theme, setTheme] = useState<Theme>("light");
  const [role, setRole] = useState<AdminRole>(null);
  const [brands, setBrands] = useState<string[]>([...KNOWN_BRANDS]);
  const [selectedBrand, setSelectedBrand] = useState<string>(KNOWN_BRANDS[0]);
  const [covers, setCovers] = useState<CoverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCovers, setLoadingCovers] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const c = COPY[language];

  const applyTheme = useCallback((next: Theme) => {
    setTheme(next);
    try { localStorage.setItem("asu-theme", next); } catch {}
    document.documentElement.dataset.asuTheme = next;
    document.documentElement.style.colorScheme = next;
  }, []);

  useEffect(() => {
    try {
      const savedLanguage = localStorage.getItem("asu-language");
      setLanguage(savedLanguage === "uz" ? "uz" : "ru");
      const savedTheme = localStorage.getItem("asu-theme");
      applyTheme(savedTheme === "dark" ? "dark" : "light");
    } catch {
      applyTheme("light");
    }
  }, [applyTheme]);

  useEffect(() => {
    let cancelled = false;
    async function loadBrands() {
      try {
        const response = await fetch("/api/cars", { cache: "no-store", credentials: "same-origin", headers: { Accept: "application/json" } });
        const body = await response.json().catch(() => null) as CarsResponse | null;
        if (response.status === 401) { location.replace("/admin/login/"); return; }
        if (!response.ok || !body?.success || !Array.isArray(body.cars)) throw new Error(body?.error || c.loadError);
        const viewerRole = body.viewer?.role ?? null;
        if (viewerRole === "sales_manager") { location.replace("/admin/cars/"); return; }
        if (viewerRole !== "admin" && viewerRole !== "super_admin") throw new Error(c.denied);

        const fromCars = body.cars.map((car) => car.brand.trim()).filter(Boolean);
        const unique = Array.from(new Set([...KNOWN_BRANDS, ...fromCars])).sort((a, b) => a.localeCompare(b));
        if (!cancelled) {
          setRole(viewerRole);
          setBrands(unique);
          setSelectedBrand((current) => unique.includes(current) ? current : unique[0] ?? KNOWN_BRANDS[0]);
          setError(null);
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : c.loadError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadBrands();
    return () => { cancelled = true; };
  }, [c.denied, c.loadError]);

  useEffect(() => {
    if (!selectedBrand || loading) return;
    let cancelled = false;
    setLoadingCovers(true);
    setError(null);
    fetch(`/api/brand-media?brand=${encodeURIComponent(selectedBrand)}`, { cache: "no-store", credentials: "same-origin", headers: { Accept: "application/json" } })
      .then(async (response) => {
        const body = await response.json().catch(() => null) as BrandMediaResponse | null;
        if (!response.ok || !body?.success) throw new Error(body?.error || c.coverError);
        return Array.isArray(body.images) ? body.images : [];
      })
      .then((images) => { if (!cancelled) setCovers(images); })
      .catch((requestError: unknown) => { if (!cancelled) setError(requestError instanceof Error ? requestError.message : c.coverError); })
      .finally(() => { if (!cancelled) setLoadingCovers(false); });
    return () => { cancelled = true; };
  }, [c.coverError, loading, selectedBrand]);

  function changeLanguage(next: Language) {
    setLanguage(next);
    try { localStorage.setItem("asu-language", next); } catch {}
  }

  async function uploadCover(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.currentTarget.value = "";
    if (!files.length || uploading || covers.length >= 3) return;

    const available = Math.max(0, 3 - covers.length);
    setUploading(true);
    setError(null);
    try {
      let next = [...covers];
      for (const file of files.slice(0, available)) {
        const optimized = await compressImageForUpload(file);
        const form = new FormData();
        form.append("brand", selectedBrand);
        form.append("file", optimized.file, optimized.file.name);
        const response = await fetch("/api/brand-media", { method: "POST", credentials: "same-origin", body: form });
        const body = await response.json().catch(() => null) as BrandMediaResponse | null;
        if (response.status === 401) { location.replace("/admin/login/"); return; }
        if (!response.ok || !body?.success || !body.image) throw new Error(body?.error || c.uploadError);
        next = [...next, body.image].slice(0, 3);
      }
      setCovers(next);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : c.uploadError);
    } finally {
      setUploading(false);
    }
  }

  async function deleteCover(key: string) {
    if (deletingKey) return;
    setDeletingKey(key);
    setError(null);
    try {
      const response = await fetch(`/api/brand-media?key=${encodeURIComponent(key)}`, { method: "DELETE", credentials: "same-origin", headers: { Accept: "application/json" } });
      const body = await response.json().catch(() => null) as BrandMediaResponse | null;
      if (response.status === 401) { location.replace("/admin/login/"); return; }
      if (!response.ok || !body?.success) throw new Error(body?.error || c.deleteError);
      setCovers((current) => current.filter((cover) => cover.key !== key));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : c.deleteError);
    } finally {
      setDeletingKey(null);
    }
  }

  const selectedLogo = LOGOS[selectedBrand] ?? null;
  const canUpload = covers.length < 3 && !uploading;
  const countLabel = useMemo(() => `${covers.length} / 3`, [covers.length]);

  return (
    <main className={styles.page} data-theme={theme}>
      <AdminChrome current="brands" language={language} theme={theme} role={role} onLanguageChange={changeLanguage} onThemeChange={applyTheme} />

      <section className={styles.hero}>
        <p>{c.eyebrow}</p>
        <h1>{c.title}</h1>
        <span>{c.lead}</span>
      </section>

      <section className={styles.content}>
        <div className={styles.brandPicker}>
          <div className={styles.sectionTitle}><span>{c.choose}</span><b>{brands.length}</b></div>
          <div className={styles.brandRail}>
            {brands.map((brand) => (
              <button type="button" key={brand} data-active={selectedBrand === brand} onClick={() => setSelectedBrand(brand)}>
                <span>{LOGOS[brand] ? <img src={LOGOS[brand]} alt="" /> : brand.slice(0, 2).toUpperCase()}</span>
                <b>{brand}</b>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.editor}>
          <header>
            <div className={styles.brandIdentity}>
              <span>{selectedLogo ? <img src={selectedLogo} alt="" /> : selectedBrand.slice(0, 2).toUpperCase()}</span>
              <div><small>{c.covers}</small><h2>{selectedBrand}</h2></div>
            </div>
            <b>{countLabel}</b>
          </header>

          <p className={styles.hint}>{c.coverHint}</p>
          {error ? <div className={styles.error}>{error}</div> : null}

          {loading || loadingCovers ? (
            <div className={styles.loadingState}><i /><span>{c.covers}</span></div>
          ) : covers.length ? (
            <div className={styles.coverGrid}>
              {covers.map((cover, index) => (
                <article className={styles.coverCard} key={cover.key}>
                  <img src={cover.url} alt={`${selectedBrand} cover ${index + 1}`} />
                  <div className={styles.coverMeta}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <small>{formatSize(cover.size)}</small>
                    <button type="button" disabled={deletingKey === cover.key} onClick={() => void deleteCover(cover.key)} aria-label={c.delete}><Trash2 /></button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <ImagePlus />
              <strong>{c.empty}</strong>
              <span>{c.emptyText}</span>
            </div>
          )}

          <input ref={fileRef} className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={uploadCover} />
          <button className={styles.uploadButton} type="button" disabled={!canUpload} onClick={() => fileRef.current?.click()}>
            <Upload />
            <span>{uploading ? c.uploading : c.upload}</span>
            <small>{countLabel}</small>
          </button>
        </div>
      </section>
    </main>
  );
}
