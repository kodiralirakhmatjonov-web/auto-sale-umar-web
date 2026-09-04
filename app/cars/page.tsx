"use client";

import { CarFront, LayoutGrid, List, Share2, Sparkles } from "lucide-react";
import { type MouseEvent, useEffect, useMemo, useState } from "react";
import PublicChrome, {
  type PublicLanguage,
  type PublicResolvedTheme,
  type PublicThemeMode,
} from "../_components/PublicChrome";
import { copyForLanguage, isPublicLanguage, publicLocale, uiText } from "../_lib/public-language";
import { shareCar, warmShareImage } from "../_lib/share-car";
import styles from "./cars.module.css";

type CarStatus = "in_stock" | "in_showroom" | "in_transit" | "made_to_order" | "reserved" | "sold" | "hidden";
type CatalogFilterStatus = CarStatus | "all" | "available";
type CatalogLayout = "two" | "one";

interface CatalogPhoto {
  id: number;
  url: string;
  isCover: boolean;
  sortOrder: number;
}

interface CatalogVariant {
  id: number;
  exteriorColorName: string | null;
  exteriorSwatch: string;
  interiorColorName: string | null;
  interiorSwatch: string;
  photos: CatalogPhoto[];
}

interface CatalogCar {
  id: number;
  slug: string;
  brand: string;
  model: string;
  year: number | null;
  trim: string | null;
  status: CarStatus;
  countryCode: string | null;
  price: number | null;
  currency: "USD" | "UZS" | "EUR";
  priceOnRequest: boolean;
  engineText: string | null;
  shortDescriptionRu: string;
  shortDescriptionUz: string;
  coverUrl: string | null;
  weeklyViews: number;
  variants?: CatalogVariant[];
}

interface CatalogResponse {
  success?: boolean;
  cars?: CatalogCar[];
}

const KNOWN_BRANDS = [
  { name: "Mercedes-Benz", logo: "/brands/mercedes-benz.jpg" },
  { name: "Range Rover", logo: "/brands/range-rover.png" },
  { name: "Rolls-Royce", logo: "/brands/rolls-royce.png" },
  { name: "Cadillac", logo: "/brands/cadillac.png" },
  { name: "Lexus", logo: "/brands/lexus.png" },
  { name: "Toyota", logo: "/brands/toyota.png" },
  { name: "Genesis", logo: "/brands/genesis.png" },
  { name: "BMW", logo: "/brands/bmw.png" },
  { name: "Lamborghini", logo: "/brands/lamborghini.png" },
  { name: "Porsche", logo: "/brands/porsche.png" },
] as const;

const STATUS_VALUES: CatalogFilterStatus[] = [
  "all",
  "available",
  "in_showroom",
  "in_stock",
  "in_transit",
  "made_to_order",
  "reserved",
  "sold",
];

const COPY = {
  ru: {
    kicker: "АВТОМОБИЛЬНЫЙ КАТАЛОГ",
    title: "Выберите автомобиль.",
    text: "Все опубликованные автомобили Auto Sale Umar в одном месте. Фильтруйте по марке и статусу — без лишних шагов.",
    allBrands: "Все",
    filters: "Фильтры",
    view: "Вид",
    two: "Две карточки",
    one: "Одна карточка",
    count: (value: number) => `${value} ${value === 1 ? "автомобиль" : value >= 2 && value <= 4 ? "автомобиля" : "автомобилей"}`,
    empty: "По выбранным фильтрам автомобилей пока нет.",
    reset: "Показать все",
    loading: "Загружаем автомобили…",
    priceRequest: "Цена по запросу",
    share: "Поделиться автомобилем",
    status: {
      all: "Все",
      available: "Доступны",
      in_showroom: "В шоуруме",
      in_stock: "В наличии",
      in_transit: "В пути",
      made_to_order: "Под заказ",
      reserved: "Резерв",
      sold: "Проданы",
      hidden: "Скрыт",
    } as Record<CatalogFilterStatus, string>,
  },
  uz: {
    kicker: "AVTOMOBILLAR KATALOGI",
    title: "Avtomobilni tanlang.",
    text: "Auto Sale Umar’dagi barcha e’lon qilingan avtomobillar bir joyda. Marka va status bo‘yicha tez filtrlang.",
    allBrands: "Barchasi",
    filters: "Filtrlar",
    view: "Ko‘rinish",
    two: "Ikki karta",
    one: "Bitta karta",
    count: (value: number) => `${value} ta avtomobil`,
    empty: "Tanlangan filtrlarda hozircha avtomobil yo‘q.",
    reset: "Barchasini ko‘rsatish",
    loading: "Avtomobillar yuklanmoqda…",
    priceRequest: "Narx so‘rov bo‘yicha",
    share: "Avtomobilni ulashish",
    status: {
      all: "Barchasi",
      available: "Mavjud",
      in_showroom: "Shourumda",
      in_stock: "Omborda",
      in_transit: "Yo‘lda",
      made_to_order: "Buyurtma",
      reserved: "Rezerv",
      sold: "Sotilgan",
      hidden: "Yashirin",
    } as Record<CatalogFilterStatus, string>,
  },
} as const;

function usePublicPreferences() {
  const [language, setLanguage] = useState<PublicLanguage>("ru");
  const [themeMode, setThemeMode] = useState<PublicThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<PublicResolvedTheme>("light");

  useEffect(() => {
    try {
      const storedLanguage = localStorage.getItem("asu-public-language");
      if (isPublicLanguage(storedLanguage)) setLanguage(storedLanguage);
      const storedTheme = localStorage.getItem("asu-public-theme");
      if (storedTheme === "system" || storedTheme === "light" || storedTheme === "dark") setThemeMode(storedTheme);
    } catch {}
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const next: PublicResolvedTheme = themeMode === "system" ? (media.matches ? "dark" : "light") : themeMode;
      setResolvedTheme(next);
      document.documentElement.dataset.asuPublicTheme = next;
      document.documentElement.style.colorScheme = next;
      const background = next === "dark" ? "#090a0b" : "#f4f4f2";
      document.documentElement.style.backgroundColor = background;
      document.body.style.backgroundColor = background;
    };
    apply();
    if (themeMode === "system") media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [themeMode]);

  function changeLanguage(next: PublicLanguage) {
    setLanguage(next);
    try { localStorage.setItem("asu-public-language", next); } catch {}
  }

  function changeTheme(next: PublicThemeMode) {
    setThemeMode(next);
    try { localStorage.setItem("asu-public-theme", next); } catch {}
  }

  return { language, themeMode, resolvedTheme, changeLanguage, changeTheme };
}

function firstPhoto(car: CatalogCar): string | null {
  if (car.coverUrl) return car.coverUrl;
  for (const variant of car.variants ?? []) {
    const photo = variant.photos?.find((item) => item.isCover) ?? variant.photos?.[0];
    if (photo?.url) return photo.url;
  }
  return null;
}

function firstColor(car: CatalogCar): { name: string | null; swatch: string } | null {
  const variant = car.variants?.[0];
  if (!variant) return null;
  return { name: variant.exteriorColorName, swatch: variant.exteriorSwatch || "#111214" };
}

function formatPrice(car: CatalogCar, language: PublicLanguage): string {
  if (car.priceOnRequest || car.price == null) return copyForLanguage(COPY, language).priceRequest;
  const value = new Intl.NumberFormat(publicLocale(language), { maximumFractionDigits: 0 }).format(car.price);
  if (car.currency === "USD") return `${value} $`;
  if (car.currency === "EUR") return `${value} €`;
  return `${value} ${uiText(language, "сум", "so‘m")}`;
}

function matchesStatus(car: CatalogCar, filter: CatalogFilterStatus): boolean {
  if (filter === "all") return car.status !== "hidden";
  if (filter === "available") return car.status === "in_showroom" || car.status === "in_stock";
  return car.status === filter;
}

function normalizeStatusFilter(value: string | null): CatalogFilterStatus {
  if (!value) return "all";
  return STATUS_VALUES.includes(value as CatalogFilterStatus) ? (value as CatalogFilterStatus) : "all";
}

function CatalogCard({ car, language, layout }: { car: CatalogCar; language: PublicLanguage; layout: CatalogLayout }) {
  const c = copyForLanguage(COPY, language);
  const photo = firstPhoto(car);
  const color = firstColor(car);
  const href = `/car/?slug=${encodeURIComponent(car.slug)}`;

  useEffect(() => {
    warmShareImage(photo, `${car.brand} ${car.model}`);
  }, [car.brand, car.model, photo]);

  return (
    <article className={styles.carCard} data-layout={layout}>
      <a className={styles.cardHit} href={href} aria-label={`${car.brand} ${car.model}`} />
      <div className={styles.cardMedia}>
        {photo ? <img src={photo} alt={`${car.brand} ${car.model}`} loading="lazy" /> : <div className={styles.photoFallback}><CarFront /></div>}
        <span className={styles.statusPill} data-status={car.status}>{c.status[car.status]}</span>
        <button
          className={styles.shareButton}
          type="button"
          aria-label={c.share}
          onClick={(event: MouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
            event.stopPropagation();
            void shareCar({
              slug: car.slug,
              brand: car.brand,
              model: car.model,
              imageUrl: photo,
            });
          }}
        >
          <Share2 />
        </button>
      </div>

      <div className={styles.cardBody}>
        <div className={styles.cardTopline}>
          <span>{car.brand.toLocaleUpperCase(publicLocale(language))}</span>
          {car.year ? <b>{car.year}</b> : null}
        </div>
        <h2>{car.model}</h2>
        {car.trim ? <p className={styles.trim}>{car.trim}</p> : null}
        {car.engineText ? <span className={styles.engine}>{car.engineText}</span> : null}
        {color ? (
          <div className={styles.colorLine}>
            <i style={{ background: color.swatch }} />
            <span>{color.name || (uiText(language, "Цвет кузова", "Kuzov rangi"))}</span>
          </div>
        ) : null}
        <div className={styles.priceLine}>
          <small>{uiText(language, "Цена", "Narx")}</small>
          <strong>{formatPrice(car, language)}</strong>
        </div>
      </div>
    </article>
  );
}

export default function CarsPage() {
  const { language, themeMode, resolvedTheme, changeLanguage, changeTheme } = usePublicPreferences();
  const c = copyForLanguage(COPY, language);
  const [cars, setCars] = useState<CatalogCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [brand, setBrand] = useState("all");
  const [status, setStatus] = useState<CatalogFilterStatus>("all");
  const [layout, setLayout] = useState<CatalogLayout>("two");

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const initialBrand = params.get("brand");
      if (initialBrand) setBrand(initialBrand);
      setStatus(normalizeStatusFilter(params.get("status")));
      const savedLayout = localStorage.getItem("asu-catalog-layout");
      if (savedLayout === "one" || savedLayout === "two") setLayout(savedLayout);
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/catalog?pageSize=100", { cache: "no-store", headers: { Accept: "application/json" } })
      .then((response) => response.json() as Promise<CatalogResponse>)
      .then((payload) => {
        if (cancelled) return;
        if (payload?.success && Array.isArray(payload.cars)) setCars(payload.cars.filter((car) => car.status !== "hidden"));
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const brandOptions = useMemo(() => {
    const names = Array.from(new Set(cars.map((car) => car.brand).filter(Boolean)));
    const knownOrder = new Map<string, number>(KNOWN_BRANDS.map((item, index) => [item.name, index]));
    return names
      .sort((a, b) => (knownOrder.get(a) ?? 999) - (knownOrder.get(b) ?? 999) || a.localeCompare(b))
      .map((name) => ({ name, logo: KNOWN_BRANDS.find((item) => item.name === name)?.logo ?? null }));
  }, [cars]);

  const filteredCars = useMemo(() => cars.filter((car) => {
    const brandMatches = brand === "all" || car.brand === brand;
    return brandMatches && matchesStatus(car, status);
  }), [brand, cars, status]);

  function syncUrl(nextBrand: string, nextStatus: CatalogFilterStatus) {
    try {
      const url = new URL(window.location.href);
      if (nextBrand === "all") url.searchParams.delete("brand");
      else url.searchParams.set("brand", nextBrand);
      if (nextStatus === "all") url.searchParams.delete("status");
      else url.searchParams.set("status", nextStatus);
      window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    } catch {}
  }

  function selectBrand(next: string) {
    setBrand(next);
    syncUrl(next, status);
  }

  function selectStatus(next: CatalogFilterStatus) {
    setStatus(next);
    syncUrl(brand, next);
  }

  function selectLayout(next: CatalogLayout) {
    setLayout(next);
    try { localStorage.setItem("asu-catalog-layout", next); } catch {}
  }

  function resetFilters() {
    setBrand("all");
    setStatus("all");
    syncUrl("all", "all");
  }

  return (
    <main className={styles.page} data-theme={resolvedTheme}>
      <PublicChrome
        language={language}
        themeMode={themeMode}
        resolvedTheme={resolvedTheme}
        backHref="/"
        onLanguageChange={changeLanguage}
        onThemeChange={changeTheme}
      />

      <section className={styles.catalogIntro}>
        <p>{c.kicker}</p>
        <h1>{c.title}</h1>
        <span>{c.text}</span>
      </section>

      <section className={styles.brandSection} aria-label={uiText(language, "Фильтр по марке", "Marka filtri")}>
        <div className={styles.brandRail}>
          <button type="button" className={styles.brandChip} data-active={brand === "all"} onClick={() => selectBrand("all")}>
            <span><Sparkles /></span><b>{c.allBrands}</b>
          </button>
          {brandOptions.map((item) => (
            <button type="button" className={styles.brandChip} data-active={brand === item.name} key={item.name} onClick={() => selectBrand(item.name)}>
              <span>{item.logo ? <img src={item.logo} alt="" /> : <b>{item.name.slice(0, 1)}</b>}</span>
              <b>{item.name}</b>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.toolbar}>
        <div className={styles.filterBlock}>
          <span className={styles.toolbarLabel}>{c.filters}</span>
          <div className={styles.statusRail}>
            {STATUS_VALUES.filter((value) => value !== "hidden").map((value) => (
              <button type="button" key={value} data-active={status === value} onClick={() => selectStatus(value)}>
                {c.status[value]}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.viewBlock}>
          <span className={styles.toolbarLabel}>{c.view}</span>
          <div className={styles.viewToggle}>
            <button type="button" data-active={layout === "two"} aria-label={c.two} onClick={() => selectLayout("two")}><LayoutGrid /></button>
            <button type="button" data-active={layout === "one"} aria-label={c.one} onClick={() => selectLayout("one")}><List /></button>
          </div>
        </div>
      </section>

      <section className={styles.resultsSection}>
        <div className={styles.resultsMeta}>
          <strong>{loading ? c.loading : c.count(filteredCars.length)}</strong>
          {(brand !== "all" || status !== "all") ? <button type="button" onClick={resetFilters}>{c.reset}</button> : null}
        </div>

        {!loading && filteredCars.length === 0 ? (
          <div className={styles.emptyState}>
            <CarFront />
            <strong>{c.empty}</strong>
            <button type="button" onClick={resetFilters}>{c.reset}</button>
          </div>
        ) : (
          <div className={styles.catalogGrid} data-layout={layout}>
            {filteredCars.map((car) => <CatalogCard key={car.id} car={car} language={language} layout={layout} />)}
          </div>
        )}
      </section>
    </main>
  );
}
