"use client";

import {
  ArrowLeftRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Gauge,
  Heart,
  Instagram,
  MessageCircle,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { copyForLanguage, isPublicLanguage, publicLocale, uiText } from "../_lib/public-language";
import { shareCar, warmShareImage } from "../_lib/share-car";
import PublicChrome, {
  type PublicLanguage,
  type PublicResolvedTheme,
  type PublicThemeMode,
} from "../_components/PublicChrome";
import styles from "./car.module.css";

type CarStatus = "in_stock" | "in_showroom" | "in_transit" | "made_to_order" | "reserved" | "sold" | "hidden";
type Currency = "USD" | "UZS" | "EUR";

interface Photo {
  id: number;
  url: string;
  isCover: boolean;
  sortOrder: number;
}

interface Variant {
  id: number;
  exteriorColorName: string | null;
  exteriorSwatch: string;
  interiorColorName: string | null;
  interiorSwatch: string;
  photos: Photo[];
  interiorPhotos?: Photo[];
}

interface PublicCar {
  id: number;
  slug: string;
  brand: string;
  model: string;
  year: number | null;
  trim: string | null;
  status: CarStatus;
  countryCode: string | null;
  arrivalDate: string | null;
  price: number | null;
  currency: Currency;
  priceOnRequest: boolean;
  mileageKm: number;
  fuelType: string | null;
  driveType: string | null;
  transmission: string | null;
  engineText: string | null;
  seats: number | null;
  exteriorColor: string | null;
  interiorColor: string | null;
  shortDescriptionRu: string;
  shortDescriptionUz: string;
  descriptionRu: string;
  descriptionUz: string;
  isNew: boolean;
  isNewArrival: boolean;
  isFeatured: boolean;
  updatedAt: string;
  coverUrl: string | null;
  weeklyViews: number;
  engineDisplacementL: number | null;
  horsepowerHp: number | null;
  torqueNm: number | null;
  acceleration0100: number | null;
  topSpeedKmh: number | null;
  fuelConsumptionL100: number | null;
  electricRangeKm: number | null;
  instagramUrl: string | null;
  variants: Variant[];
}

interface DetailResponse {
  success?: boolean;
  error?: string;
  car?: PublicCar;
}

interface BrandCoverItem {
  key: string;
  url: string;
  size: number;
  uploadedAt: string | null;
}

interface BrandMediaResponse {
  success?: boolean;
  images?: BrandCoverItem[];
}

const COPY = {
  ru: {
    loading: "Загружаем автомобиль",
    error: "Не удалось открыть автомобиль.",
    back: "Вернуться в каталог",
    selected: "AUTO SALE UMAR · SELECTED",
    status: "Статус",
    year: "Год",
    mileage: "Пробег",
    engine: "Двигатель",
    drive: "Привод",
    transmission: "Коробка",
    seats: "Мест",
    source: "Рынок поставки",
    arrival: "Ожидаемая дата",
    power: "Мощность",
    torque: "Крутящий момент",
    acceleration: "0–100 км/ч",
    speed: "Макс. скорость",
    economy: "Расход",
    range: "Запас хода",
    detailsKicker: "ХАРАКТЕР В ДЕТАЛЯХ",
    detailsTitle: "Автомобиль, который раскрывается ближе.",
    detailsFallback: "Фотографии и характеристики относятся к конкретному автомобилю из базы Auto Sale Umar.",
    exterior: "Экстерьер",
    interior: "Салон",
    selectedColor: "Выбранный цвет",
    interiorColor: "Цвет салона",
    performanceKicker: "ДИНАМИКА",
    performanceTitle: "Уверенность в каждом движении.",
    comfortKicker: "ИНТЕРЬЕР",
    comfortTitle: "Тишина становится частью автомобиля.",
    galleryKicker: "ГАЛЕРЕЯ",
    galleryTitle: "Посмотрите автомобиль со всех сторон.",
    availability: "Автомобиль доступен",
    availabilityText: "Запишитесь на просмотр или свяжитесь с менеджером Auto Sale Umar.",
    book: "Забронировать визит",
    manager: "Связаться с менеджером",
    instagram: "Смотреть обзор в Instagram",
    compare: "Сравнить автомобиль",
    share: "Поделиться автомобилем",
    favoriteAdd: "Добавить в избранное",
    favoriteRemove: "Убрать из избранного",
    priceRequest: "Цена по запросу",
    footer: "Selected with precision.",
    in_showroom: "В шоуруме",
    in_stock: "В наличии",
    in_transit: "В пути",
    made_to_order: "Под заказ",
    reserved: "Резерв",
    sold: "Продан",
    hidden: "Скрыт",
  },
  uz: {
    loading: "Avtomobil yuklanmoqda",
    error: "Avtomobilni ochib bo‘lmadi.",
    back: "Katalogga qaytish",
    selected: "AUTO SALE UMAR · SELECTED",
    status: "Holat",
    year: "Yil",
    mileage: "Yurgan masofa",
    engine: "Dvigatel",
    drive: "Uzatma",
    transmission: "Quti",
    seats: "O‘rin",
    source: "Yetkazib berish bozori",
    arrival: "Kutilayotgan sana",
    power: "Quvvat",
    torque: "Aylanish momenti",
    acceleration: "0–100 km/soat",
    speed: "Maks. tezlik",
    economy: "Sarf",
    range: "Yurish zaxirasi",
    detailsKicker: "XARAKTER DETALLARDA",
    detailsTitle: "Yaqindan yanada ko‘proq ochiladigan avtomobil.",
    detailsFallback: "Suratlar va xususiyatlar Auto Sale Umar bazasidagi aniq avtomobilga tegishli.",
    exterior: "Tashqi ko‘rinish",
    interior: "Salon",
    selectedColor: "Tanlangan rang",
    interiorColor: "Salon rangi",
    performanceKicker: "DINAMIKA",
    performanceTitle: "Har bir harakatda ishonch.",
    comfortKicker: "INTERYER",
    comfortTitle: "Sokinlik avtomobilning bir qismiga aylanadi.",
    galleryKicker: "GALEREYA",
    galleryTitle: "Avtomobilni har tomondan ko‘ring.",
    availability: "Avtomobil mavjud",
    availabilityText: "Ko‘rishga yoziling yoki Auto Sale Umar menejeri bilan bog‘laning.",
    book: "Tashrifni band qilish",
    manager: "Menejer bilan bog‘lanish",
    instagram: "Instagram sharhini ko‘rish",
    compare: "Avtomobilni solishtirish",
    share: "Avtomobilni ulashish",
    favoriteAdd: "Sevimlilarga qo‘shish",
    favoriteRemove: "Sevimlilardan olib tashlash",
    priceRequest: "Narx so‘rov bo‘yicha",
    footer: "Selected with precision.",
    in_showroom: "Shourumda",
    in_stock: "Mavjud",
    in_transit: "Yo‘lda",
    made_to_order: "Buyurtma asosida",
    reserved: "Band qilingan",
    sold: "Sotilgan",
    hidden: "Yashirilgan",
  },
} as const;

const BRAND_LOGOS: Record<string, string> = {
  "mercedes-benz": "/brands/mercedes-benz.jpg",
  "range rover": "/brands/range-rover.png",
  "rolls-royce": "/brands/rolls-royce.png",
  cadillac: "/brands/cadillac.png",
  lexus: "/brands/lexus.png",
  toyota: "/brands/toyota.png",
  genesis: "/brands/genesis.png",
  bmw: "/brands/bmw.png",
  lamborghini: "/brands/lamborghini.png",
  porsche: "/brands/porsche.png",
};

const COUNTRY_NAMES = {
  ru: { US: "США", CA: "Канада", KR: "Корея", AE: "ОАЭ", DE: "Германия", GB: "Великобритания", AU: "Австралия", EU: "Европа" },
  uz: { US: "AQSH", CA: "Kanada", KR: "Koreya", AE: "BAA", DE: "Germaniya", GB: "Buyuk Britaniya", AU: "Avstraliya", EU: "Yevropa" },
} as const;

function brandLogo(brand: string): string | null {
  return BRAND_LOGOS[brand.trim().toLowerCase()] ?? null;
}

function formatPrice(car: PublicCar, language: PublicLanguage): string {
  if (car.priceOnRequest || car.price == null) return copyForLanguage(COPY, language).priceRequest;
  const amount = new Intl.NumberFormat(publicLocale(language), { maximumFractionDigits: 0 }).format(car.price);
  if (car.currency === "USD") return `${amount} $`;
  if (car.currency === "EUR") return `${amount} €`;
  return `${amount} ${uiText(language, "сум", "so‘m")}`;
}

function countryLabel(code: string | null, language: PublicLanguage): string | null {
  if (!code) return null;
  return copyForLanguage(COUNTRY_NAMES, language)[code as keyof typeof COUNTRY_NAMES.ru] ?? code;
}

function statusLabel(status: CarStatus, language: PublicLanguage): string {
  return copyForLanguage(COPY, language)[status];
}

function usePublicPreferences() {
  const [language, setLanguage] = useState<PublicLanguage>("ru");
  const [themeMode, setThemeMode] = useState<PublicThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<PublicResolvedTheme>("light");

  useEffect(() => {
    try {
      const storedLanguage = localStorage.getItem("asu-public-language");
      if (isPublicLanguage(storedLanguage)) setLanguage(storedLanguage);
      else if (navigator.language.toLowerCase().startsWith("uz")) setLanguage("uz");
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
      const background = next === "dark" ? "#09090a" : "#f4f4f2";
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

function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} className={`${styles.reveal} ${visible ? styles.revealVisible : ""} ${className}`}>{children}</div>;
}

export default function CarPage() {
  const { language, themeMode, resolvedTheme, changeLanguage, changeTheme } = usePublicPreferences();
  const c = copyForLanguage(COPY, language);
  const [car, setCar] = useState<PublicCar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [variantIndex, setVariantIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const [coverIndex, setCoverIndex] = useState(0);
  const [brandCovers, setBrandCovers] = useState<BrandCoverItem[]>([]);
  const photoRailRef = useRef<HTMLDivElement | null>(null);
  const coverRailRef = useRef<HTMLDivElement | null>(null);
  const recordedViewSlugRef = useRef<string | null>(null);

  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("slug")?.trim() ?? "";
    if (!slug) {
      setError(c.error);
      setLoading(false);
      return;
    }

    let cancelled = false;
    fetch(`/api/catalog?slug=${encodeURIComponent(slug)}`, { cache: "no-store", headers: { Accept: "application/json" } })
      .then(async (response) => {
        const body = await response.json() as DetailResponse;
        if (!response.ok || !body.success || !body.car) throw new Error(c.error);
        return body.car;
      })
      .then((nextCar) => {
        if (cancelled) return;
        setCar(nextCar);
        setVariantIndex(0);
        setPhotoIndex(0);
        setLoading(false);
        try {
          const stored = JSON.parse(localStorage.getItem("asu-public-favorites") || "[]") as unknown;
          const values = Array.isArray(stored) ? stored.filter((item): item is string => typeof item === "string") : [];
          setFavorite(values.includes(nextCar.slug));
        } catch {}
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : c.error);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [c.error]);

  useEffect(() => {
    if (!car?.slug || recordedViewSlugRef.current === car.slug) return;
    recordedViewSlugRef.current = car.slug;

    fetch("/api/car-views", {
      method: "POST",
      headers: { "content-type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ slug: car.slug }),
    }).catch(() => undefined);
  }, [car?.slug]);

  useEffect(() => {
    if (!car?.brand) {
      setBrandCovers([]);
      setCoverIndex(0);
      return;
    }

    let cancelled = false;
    setCoverIndex(0);
    fetch(`/api/brand-media?brand=${encodeURIComponent(car.brand)}`, { cache: "no-store", headers: { Accept: "application/json" } })
      .then(async (response) => {
        const body = await response.json().catch(() => null) as BrandMediaResponse | null;
        if (!response.ok || !body?.success || !Array.isArray(body.images)) return [] as BrandCoverItem[];
        return body.images.slice(0, 3);
      })
      .then((images) => { if (!cancelled) setBrandCovers(images); })
      .catch(() => { if (!cancelled) setBrandCovers([]); });

    return () => { cancelled = true; };
  }, [car?.brand]);

  useEffect(() => {
    if (brandCovers.length < 2) return;
    const timer = window.setInterval(() => {
      setCoverIndex((current) => (current + 1) % brandCovers.length);
    }, 5600);
    return () => window.clearInterval(timer);
  }, [brandCovers.length]);

  const activeVariant = car?.variants[Math.min(variantIndex, Math.max((car?.variants.length ?? 1) - 1, 0))] ?? null;
  const exteriorPhotos = useMemo(() => {
    if (!car) return [] as Photo[];
    if (activeVariant?.photos?.length) return activeVariant.photos;
    return car.coverUrl ? [{ id: -1, url: car.coverUrl, isCover: true, sortOrder: 0 }] : [];
  }, [car, activeVariant]);
  const interiorPhotos = activeVariant?.interiorPhotos ?? [];
  const allGallery = useMemo(() => [...exteriorPhotos, ...interiorPhotos], [exteriorPhotos, interiorPhotos]);
  const sharePhotoUrl = exteriorPhotos[0]?.url ?? car?.coverUrl ?? null;

  useEffect(() => {
    if (!car) return;
    warmShareImage(sharePhotoUrl, `${car.brand} ${car.model}`);
  }, [car, sharePhotoUrl]);

  function toggleFavorite() {
    if (!car) return;
    const next = !favorite;
    setFavorite(next);
    try {
      const stored = JSON.parse(localStorage.getItem("asu-public-favorites") || "[]") as unknown;
      const values = Array.isArray(stored) ? stored.filter((item): item is string => typeof item === "string") : [];
      const result = next ? Array.from(new Set([...values, car.slug])) : values.filter((item) => item !== car.slug);
      localStorage.setItem("asu-public-favorites", JSON.stringify(result));
    } catch {}
  }

  async function shareCurrentCar() {
    if (!car) return;
    await shareCar({
      slug: car.slug,
      brand: car.brand,
      model: car.model,
      imageUrl: exteriorPhotos[0]?.url ?? car.coverUrl,
    });
  }

  function selectVariant(index: number) {
    setVariantIndex(index);
    setPhotoIndex(0);
    photoRailRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  }

  function handlePhotoScroll() {
    const rail = photoRailRef.current;
    if (!rail || rail.clientWidth <= 0) return;
    setPhotoIndex(Math.round(rail.scrollLeft / rail.clientWidth));
  }

  function handleCoverScroll() {
    if (brandCovers.length) return;
    const rail = coverRailRef.current;
    if (!rail || rail.clientWidth <= 0) return;
    setCoverIndex(Math.round(rail.scrollLeft / rail.clientWidth));
  }

  if (loading) {
    return (
      <main className={styles.statePage} data-theme={resolvedTheme}>
        <PublicChrome language={language} themeMode={themeMode} resolvedTheme={resolvedTheme} backHref="/" onLanguageChange={changeLanguage} onThemeChange={changeTheme} />
        <div className={styles.stateCard}><span className={styles.loader} /><strong>{c.loading}</strong></div>
      </main>
    );
  }

  if (!car || error) {
    return (
      <main className={styles.statePage} data-theme={resolvedTheme}>
        <PublicChrome language={language} themeMode={themeMode} resolvedTheme={resolvedTheme} backHref="/" onLanguageChange={changeLanguage} onThemeChange={changeTheme} />
        <div className={styles.stateCard}><strong>{error || c.error}</strong><a href="/#cars">{c.back}<ChevronRight /></a></div>
      </main>
    );
  }

  const logo = brandLogo(car.brand);
  const description = language === "ru" ? (car.descriptionRu || car.shortDescriptionRu) : (car.descriptionUz || car.shortDescriptionUz);
  const shortDescription = language === "ru" ? car.shortDescriptionRu : car.shortDescriptionUz;
  const heroPhoto = exteriorPhotos[0]?.url ?? car.coverUrl;
  const selectedExterior = activeVariant?.exteriorColorName || car.exteriorColor || "";
  const selectedInterior = activeVariant?.interiorColorName || car.interiorColor || "";
  const bookingHref = `/booking/?brand=${encodeURIComponent(car.brand)}&car=${encodeURIComponent(`${car.brand} ${car.model}`)}`;
  const compareHref = `/compare/?cars=${encodeURIComponent(car.slug)}`;

  const specs = [
    car.horsepowerHp != null ? { label: c.power, value: `${car.horsepowerHp} ${uiText(language, "л.с.", "o.k.")}` } : null,
    car.torqueNm != null ? { label: c.torque, value: `${car.torqueNm} ${uiText(language, "Н·м", "N·m")}` } : null,
    car.acceleration0100 != null ? { label: c.acceleration, value: `${car.acceleration0100} ${uiText(language, "с", "s")}` } : null,
    car.driveType ? { label: c.drive, value: car.driveType } : null,
    car.mileageKm != null ? { label: c.mileage, value: `${new Intl.NumberFormat(publicLocale(language)).format(car.mileageKm)} ${uiText(language, "км", "km")}` } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const secondarySpecs = [
    car.engineText ? { label: c.engine, value: car.engineText } : null,
    car.transmission ? { label: c.transmission, value: car.transmission } : null,
    car.seats != null ? { label: c.seats, value: String(car.seats) } : null,
    countryLabel(car.countryCode, language) ? { label: c.source, value: countryLabel(car.countryCode, language)! } : null,
    car.topSpeedKmh != null ? { label: c.speed, value: `${car.topSpeedKmh} ${uiText(language, "км/ч", "km/soat")}` } : null,
    car.fuelConsumptionL100 != null ? { label: c.economy, value: `${car.fuelConsumptionL100} ${uiText(language, "л/100 км", "l/100 km")}` } : null,
    car.electricRangeKm != null ? { label: c.range, value: `${car.electricRangeKm} ${uiText(language, "км", "km")}` } : null,
    car.arrivalDate ? { label: c.arrival, value: car.arrivalDate } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <main className={styles.page} data-theme={resolvedTheme}>
      <PublicChrome language={language} themeMode={themeMode} resolvedTheme={resolvedTheme} backHref="/" onLanguageChange={changeLanguage} onThemeChange={changeTheme} />

      <section className={styles.brandStage} aria-label={car.brand}>
        {brandCovers.length ? (
          <div className={styles.brandCoverShow}>
            {brandCovers.map((cover, index) => (
              <div className={styles.brandCoverImage} data-active={coverIndex === index} key={cover.key}>
                <img src={cover.url} alt={`${car.brand} · ${index + 1}`} loading="eager" decoding="async" />
                <div className={styles.brandCoverShade} aria-hidden="true" />
                <small>AUTO SALE UMAR · {car.brand.toUpperCase()}</small>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.brandCoverRail} ref={coverRailRef} onScroll={handleCoverScroll}>
            {["quiet", "light", "dark"].map((variant) => (
              <div className={styles.brandCover} data-variant={variant} key={variant}>
                <span className={styles.brandGhost}>{car.brand}</span>
                <div className={styles.brandCoverCenter}>
                  {logo ? <img src={logo} alt="" /> : <b>{car.brand}</b>}
                  <small>AUTO SALE UMAR · {car.brand.toUpperCase()}</small>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className={styles.coverDots} aria-hidden="true">
          {Array.from({ length: brandCovers.length || 3 }, (_, index) => <i key={index} data-active={coverIndex === index} />)}
        </div>
      </section>

      <section className={styles.brandMedallionWrap}>
        <div className={styles.brandMedallion}>{logo ? <img src={logo} alt={car.brand} /> : <b>{car.brand}</b>}</div>
        <span>{car.brand}</span>
      </section>

      <section className={styles.heroSection}>
        <Reveal className={styles.heroCopy}>
          <div className={styles.eyebrow}>{car.year ? `${car.year} · ` : ""}{car.trim || car.engineText || car.brand}</div>
          <h1>{car.brand} <span>{car.model}</span></h1>
          <div className={styles.heroStatusRow}>
            <span className={styles.statusPill} data-status={car.status}>{statusLabel(car.status, language)}</span>
            <strong>{formatPrice(car, language)}</strong>
          </div>
          {shortDescription ? <p>{shortDescription}</p> : null}
          <div className={styles.heroActions}>
            <a className={styles.primaryButton} href={bookingHref}><CalendarDays /><span>{c.book}</span></a>
            <button className={styles.favoriteButton} type="button" onClick={toggleFavorite} data-active={favorite} aria-label={favorite ? c.favoriteRemove : c.favoriteAdd}>
              <Heart fill={favorite ? "currentColor" : "none"} />
              <span>{favorite ? c.favoriteRemove : c.favoriteAdd}</span>
            </button>
            <button className={styles.shareButton} type="button" onClick={() => void shareCurrentCar()} aria-label={c.share}>
              <Share2 />
              <span>{c.share}</span>
            </button>
          </div>
        </Reveal>

        <Reveal className={styles.heroMedia}>
          <div className={styles.photoRail} ref={photoRailRef} onScroll={handlePhotoScroll}>
            {exteriorPhotos.length ? exteriorPhotos.map((photo) => (
              <div className={styles.photoSlide} key={photo.id}><img src={photo.url} alt={`${car.brand} ${car.model}`} /></div>
            )) : <div className={styles.photoFallback}>{car.brand} {car.model}</div>}
          </div>
          {exteriorPhotos.length > 1 ? <div className={styles.photoDots}>{exteriorPhotos.map((photo, index) => <i key={photo.id} data-active={photoIndex === index} />)}</div> : null}
        </Reveal>

        {specs.length ? <Reveal className={styles.specStrip}>{specs.slice(0, 5).map((item) => <div key={item.label}><strong>{item.value}</strong><span>{item.label}</span></div>)}</Reveal> : null}
      </section>

      <section className={styles.editorialSection}>
        <Reveal className={styles.editorialCopy}>
          <p className={styles.kicker}>{c.detailsKicker}</p>
          <h2>{c.detailsTitle}</h2>
          <p>{description || c.detailsFallback}</p>
        </Reveal>
        <Reveal className={styles.editorialPhoto}>{heroPhoto ? <img src={heroPhoto} alt={`${car.brand} ${car.model}`} /> : null}</Reveal>
      </section>

      {(exteriorPhotos.length > 1 || interiorPhotos.length > 0) ? (
        <section className={styles.detailTiles}>
          {[exteriorPhotos[1], exteriorPhotos[2], interiorPhotos[0]].filter(Boolean).map((photo, index) => (
            <Reveal className={styles.detailTile} key={(photo as Photo).id}>
              <img src={(photo as Photo).url} alt="" />
              <div><strong>{index === 2 ? c.interior : c.exterior}</strong><span>{index === 0 ? selectedExterior : index === 2 ? selectedInterior : car.model}</span></div>
            </Reveal>
          ))}
        </section>
      ) : null}

      {(car.horsepowerHp != null || car.torqueNm != null || car.acceleration0100 != null || car.topSpeedKmh != null) ? (
        <section className={styles.performanceSection}>
          <Reveal className={styles.performanceHeading}>
            <p className={styles.kicker}>{c.performanceKicker}</p>
            <h2>{c.performanceTitle}</h2>
          </Reveal>
          <Reveal className={styles.performanceNumber}><span>{car.horsepowerHp ?? car.torqueNm ?? car.topSpeedKmh ?? "—"}</span></Reveal>
          <Reveal className={styles.performanceGrid}>
            {[
              car.horsepowerHp != null ? { value: `${car.horsepowerHp}`, unit: uiText(language, "л.с.", "o.k."), label: c.power } : null,
              car.torqueNm != null ? { value: `${car.torqueNm}`, unit: uiText(language, "Н·м", "N·m"), label: c.torque } : null,
              car.acceleration0100 != null ? { value: `${car.acceleration0100}`, unit: uiText(language, "с", "s"), label: c.acceleration } : null,
              car.topSpeedKmh != null ? { value: `${car.topSpeedKmh}`, unit: uiText(language, "км/ч", "km/soat"), label: c.speed } : null,
            ].filter(Boolean).map((item) => {
              const metric = item as { value: string; unit: string; label: string };
              return <div key={metric.label}><strong>{metric.value}<small>{metric.unit}</small></strong><span>{metric.label}</span></div>;
            })}
          </Reveal>
        </section>
      ) : null}

      {interiorPhotos.length ? (
        <section className={styles.interiorSection}>
          <Reveal className={styles.interiorCopy}>
            <p className={styles.kicker}>{c.comfortKicker}</p>
            <h2>{c.comfortTitle}</h2>
            <div className={styles.colorSummary}>
              {selectedExterior ? <div><i style={{ backgroundColor: activeVariant?.exteriorSwatch || "#111214" }} /><span><small>{c.selectedColor}</small><b>{selectedExterior}</b></span></div> : null}
              {selectedInterior ? <div><i style={{ backgroundColor: activeVariant?.interiorSwatch || "#111214" }} /><span><small>{c.interiorColor}</small><b>{selectedInterior}</b></span></div> : null}
            </div>
          </Reveal>
          <Reveal className={styles.interiorHero}><img src={interiorPhotos[0].url} alt={`${car.brand} ${car.model} ${c.interior}`} /></Reveal>
        </section>
      ) : null}

      {car.variants.length > 1 ? (
        <section className={styles.variantsSection}>
          <Reveal>
            <p className={styles.kicker}>{uiText(language, "ДОСТУПНЫЕ ЦВЕТА", "MAVJUD RANGLAR")}</p>
            <h2>{uiText(language, "Выберите свой оттенок.", "O‘zingizga mos rangni tanlang.")}</h2>
          </Reveal>
          <div className={styles.variantRail}>
            {car.variants.map((variant, index) => (
              <button key={variant.id} type="button" data-active={index === variantIndex} onClick={() => selectVariant(index)}>
                <i style={{ backgroundColor: variant.exteriorSwatch || "#111214" }} />
                <span><b>{variant.exteriorColorName || `${uiText(language, "Цвет", "Rang")} ${index + 1}`}</b>{variant.interiorColorName ? <small>{variant.interiorColorName}</small> : null}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {allGallery.length > 2 ? (
        <section className={styles.gallerySection}>
          <Reveal>
            <p className={styles.kicker}>{c.galleryKicker}</p>
            <h2>{c.galleryTitle}</h2>
          </Reveal>
          <div className={styles.galleryRail}>{allGallery.map((photo, index) => <div key={`${photo.id}-${index}`}><img src={photo.url} alt={`${car.brand} ${car.model}`} /></div>)}</div>
        </section>
      ) : null}

      {secondarySpecs.length ? (
        <section className={styles.dataSection}>
          <Reveal className={styles.dataCard}>
            <div className={styles.dataCardHeading}><Gauge /><strong>{uiText(language, "Характеристики", "Xususiyatlar")}</strong></div>
            <div className={styles.dataGrid}>{secondarySpecs.map((item) => <div key={item.label}><span>{item.label}</span><b>{item.value}</b></div>)}</div>
          </Reveal>
        </section>
      ) : null}

      <section className={styles.ctaSection}>
        <Reveal className={styles.ctaCard}>
          <div className={styles.ctaVisual}>{heroPhoto ? <img src={heroPhoto} alt="" /> : null}</div>
          <div className={styles.ctaCopy}>
            <span><ShieldCheck />{c.availability}</span>
            <h2>{car.brand} {car.model}</h2>
            <strong>{formatPrice(car, language)}</strong>
            <p>{c.availabilityText}</p>
            <div className={styles.ctaActions}>
              <a href={bookingHref}><CalendarDays />{c.book}<ChevronRight /></a>
              <a href="https://wa.me/998771155553" target="_blank" rel="noreferrer"><MessageCircle />{c.manager}<ArrowUpRight /></a>
              {car.instagramUrl ? <a href={car.instagramUrl} target="_blank" rel="noreferrer"><Instagram />{c.instagram}<ArrowUpRight /></a> : null}
              <a href={compareHref}><ArrowLeftRight />{c.compare}<ChevronRight /></a>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className={styles.footer}>
        <img src={resolvedTheme === "dark" ? "/brand/asu-wordmark-white.png" : "/brand/asu-wordmark-black.png"} alt="Auto Sale Umar" />
        <span>{c.footer}</span>
      </footer>
    </main>
  );
}
