"use client";

import { AnimatePresence, motion } from "framer-motion";
import { type SyntheticEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./display.module.css";

type CarStatus = "in_stock" | "in_showroom" | "in_transit" | "made_to_order" | "reserved" | "sold" | "hidden";
type Currency = "USD" | "UZS" | "EUR";
type DisplayPhase = "loading" | "intro" | "welcome" | "catalog";
type SceneMode = "dark" | "light";

interface CatalogPhoto {
  id: number;
  url: string;
  isCover: boolean;
  isDisplayCover?: boolean;
  displayFlipHorizontal?: boolean;
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

interface DisplayCar {
  id: number;
  slug: string;
  brand: string;
  model: string;
  year: number | null;
  trim: string | null;
  status: CarStatus;
  countryCode: string | null;
  price: number | null;
  currency: Currency;
  priceOnRequest: boolean;
  mileageKm: number;
  fuelType: string | null;
  driveType: string | null;
  transmission: string | null;
  engineText: string | null;
  seats: number | null;
  shortDescriptionRu: string;
  coverUrl: string | null;
  variants?: CatalogVariant[];
}

interface CatalogResponse {
  success?: boolean;
  cars?: DisplayCar[];
}

type FullscreenHost = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
};

interface DisplayCachePayload {
  timestamp: number;
  cars: DisplayCar[];
}

function getFullscreenElement(doc: FullscreenDocument): Element | null {
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

const ROTATION_MS = 11_000;
const CATALOG_REFRESH_MS = 5 * 60_000;
const DISPLAY_CACHE_TTL_MS = 30 * 60_000;
const INTRO_FALLBACK_MS = 9_000;
const WELCOME_DURATION_MS = 5_200;
const DISPLAY_CACHE_KEY = "asu:display:catalog:v2";

const STATUS_LABELS: Record<CarStatus, string> = {
  in_stock: "В НАЛИЧИИ",
  in_showroom: "В ШОУРУМЕ",
  in_transit: "В ПУТИ",
  made_to_order: "ПОД ЗАКАЗ",
  reserved: "РЕЗЕРВ",
  sold: "ПРОДАН",
  hidden: "СКРЫТ",
};

const COUNTRY_LABELS: Record<string, string> = {
  US: "США",
  CA: "КАНАДА",
  KR: "КОРЕЯ",
  AE: "ОАЭ",
  DE: "ГЕРМАНИЯ",
  GB: "ВЕЛИКОБРИТАНИЯ",
  AU: "АВСТРАЛИЯ",
  EU: "ЕВРОПА",
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatPrice(car: DisplayCar): string {
  if (car.priceOnRequest || car.price == null) return "ЦЕНА ПО ЗАПРОСУ";
  const value = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(car.price);
  if (car.currency === "USD") return `${value} $`;
  if (car.currency === "EUR") return `${value} €`;
  return `${value} СУМ`;
}

function primaryPhoto(car: DisplayCar): CatalogPhoto | null {
  for (const variant of car.variants ?? []) {
    const cover = variant.photos?.find((photo) => photo.isCover) ?? variant.photos?.[0];
    if (cover?.url) return cover;
  }
  return car.coverUrl ? { id: -1, url: car.coverUrl, isCover: true, sortOrder: 0 } : null;
}

function carImage(car: DisplayCar): string {
  return primaryPhoto(car)?.url ?? "/intro-poster.jpg";
}

function secondChainPhoto(car: DisplayCar): CatalogPhoto | null {
  for (const variant of car.variants ?? []) {
    const displayCover = variant.photos?.find((photo) => photo.isDisplayCover);
    if (displayCover?.url) return displayCover;
  }
  return primaryPhoto(car);
}

function displayAsset(car: DisplayCar, sceneMode: SceneMode): { src: string; flipped: boolean } {
  const photo = sceneMode === "light" ? secondChainPhoto(car) : primaryPhoto(car);
  return {
    src: photo?.url ?? "/intro-poster.jpg",
    flipped: Boolean(sceneMode === "light" && photo?.displayFlipHorizontal),
  };
}

function normalizeFuel(value: string | null): string {
  if (!value) return "ПРЕМИУМ";
  const key = value.trim().toLowerCase();
  if (key.includes("electric") || key.includes("элект")) return "ЭЛЕКТРО";
  if (key.includes("hybrid") || key.includes("гибрид")) return "ГИБРИД";
  if (key.includes("diesel") || key.includes("диз")) return "ДИЗЕЛЬ";
  if (key.includes("gas") || key.includes("petrol") || key.includes("бенз")) return "БЕНЗИН";
  return value.toLocaleUpperCase("ru-RU");
}

function normalizeDrive(value: string | null): string {
  if (!value) return "PREMIUM";
  const key = value.trim().toLowerCase();
  if (key.includes("awd") || key.includes("полный") || key.includes("4wd")) return "AWD";
  if (key.includes("rwd") || key.includes("задн")) return "RWD";
  if (key.includes("fwd") || key.includes("передн")) return "FWD";
  return value.toLocaleUpperCase("ru-RU");
}

function compactTrim(value: string | null): string {
  if (!value) return "ПРЕМИУМ";
  const cleaned = value.trim();
  return cleaned.length > 22 ? `${cleaned.slice(0, 20)}…` : cleaned.toLocaleUpperCase("ru-RU");
}

function publicCarUrl(slug: string): string {
  return `https://autosaleumar.com/car/?slug=${encodeURIComponent(slug)}`;
}

function tvCarUrl(slug: string): string {
  return `/display/car/?slug=${encodeURIComponent(slug)}`;
}

function qrUrl(slug: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=0&format=png&data=${encodeURIComponent(publicCarUrl(slug))}`;
}

function displayDescription(car: DisplayCar): string {
  const description = car.shortDescriptionRu?.trim();
  if (description) return description;
  if (car.status === "in_transit") return "Следующее поступление Auto Sale Umar.";
  if (car.status === "made_to_order") return "Подберём конфигурацию точно под ваш запрос.";
  if (car.status === "reserved") return "Автомобиль выбран и находится в резерве.";
  return "Автомобиль, выбранный точно.";
}

function clampIndex(value: number, length: number): number {
  if (length <= 0) return 0;
  return Math.min(Math.max(value, 0), length - 1);
}

function catalogSignature(cars: DisplayCar[]): string {
  return cars
    .map((car) => {
      const darkSrc = car.coverUrl ?? carImage(car);
      const lightPhoto = secondChainPhoto(car);
      return [
        car.id,
        car.slug,
        car.status,
        car.price ?? "",
        car.currency,
        car.priceOnRequest ? 1 : 0,
        darkSrc,
        lightPhoto?.url ?? "",
        lightPhoto?.displayFlipHorizontal ? 1 : 0,
      ].join("|");
    })
    .join("||");
}

function readCatalogCache(): DisplayCachePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DISPLAY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DisplayCachePayload;
    if (!parsed || !Array.isArray(parsed.cars) || typeof parsed.timestamp !== "number") return null;
    if (Date.now() - parsed.timestamp > DISPLAY_CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCatalogCache(cars: DisplayCar[]): void {
  if (typeof window === "undefined") return;
  try {
    const payload: DisplayCachePayload = { timestamp: Date.now(), cars };
    window.localStorage.setItem(DISPLAY_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota and serialization failures for showroom display
  }
}

function StatusPill({ status }: { status: CarStatus }) {
  return (
    <span className={styles.statusPill} data-status={status}>
      <i aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}

function SpecCell({ value }: { value: string }) {
  return (
    <div className={styles.specCell}>
      <strong>{value}</strong>
    </div>
  );
}

export default function DisplayPage() {
  const [cars, setCars] = useState<DisplayCar[]>([]);
  const [index, setIndex] = useState(0);
  const [time, setTime] = useState(() => new Date());
  const [error, setError] = useState(false);
  const [phase, setPhase] = useState<DisplayPhase>("loading");
  const [sceneMode, setSceneMode] = useState<SceneMode>("dark");
  const [forcedSceneMode, setForcedSceneMode] = useState<SceneMode | null>(null);
  const [modeReady, setModeReady] = useState(false);
  const [introCycle, setIntroCycle] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenSupported, setFullscreenSupported] = useState(false);
  const [fullscreenHint, setFullscreenHint] = useState<string | null>(null);

  const rootRef = useRef<HTMLElement | null>(null);
  const currentSlugRef = useRef<string | null>(null);
  const pendingIndexRef = useRef<number | null>(0);
  const warmedAssetsRef = useRef<Set<string>>(new Set());
  const catalogSignatureRef = useRef<string>("");

  useEffect(() => {
    currentSlugRef.current = cars[index]?.slug ?? null;
    catalogSignatureRef.current = catalogSignature(cars);
  }, [cars, index]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedMode = params.get("mode");
    if (requestedMode === "light" || requestedMode === "dark") {
      setForcedSceneMode(requestedMode);
      setSceneMode(requestedMode);
    }
    setModeReady(true);
  }, []);

  useEffect(() => {
    const doc = document as FullscreenDocument;
    const root = rootRef.current as FullscreenHost | null;

    setFullscreenSupported(Boolean(root && (root.requestFullscreen || root.webkitRequestFullscreen || doc.exitFullscreen || doc.webkitExitFullscreen)));

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(getFullscreenElement(doc)));
    };

    handleFullscreenChange();
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange as EventListener);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange as EventListener);
    };
  }, []);

  useEffect(() => {
    const cached = readCatalogCache();
    if (!cached || cached.cars.length === 0) return;
    setCars(cached.cars);
    setError(false);
  }, []);

  useEffect(() => {
    if (!fullscreenHint) return;
    const timeout = window.setTimeout(() => setFullscreenHint(null), 5200);
    return () => window.clearTimeout(timeout);
  }, [fullscreenHint]);

  const toggleFullscreen = useCallback(async () => {
    const doc = document as FullscreenDocument;
    const root = rootRef.current as FullscreenHost | null;
    if (!root) return;

    if (!fullscreenSupported) {
      setFullscreenHint("Если рамка браузера остаётся видимой, откройте меню Samsung Browser вверху справа и включите полноэкранный режим.");
      return;
    }

    try {
      if (getFullscreenElement(doc)) {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
        return;
      }

      if (root.requestFullscreen) {
        await root.requestFullscreen();
      } else if (root.webkitRequestFullscreen) {
        await root.webkitRequestFullscreen();
      }
    } catch (fullscreenError) {
      console.error("Showroom display fullscreen toggle failed", fullscreenError);
      setFullscreenHint("Этот браузер не дал сайту переключить полноэкранный режим. Используйте меню браузера Samsung TV → Full screen.");
    }
  }, [fullscreenSupported]);

  const startSequence = useCallback(
    (nextMode: SceneMode, targetIndex: number) => {
      pendingIndexRef.current = clampIndex(targetIndex, cars.length);
      setSceneMode(nextMode);
      setPhase("intro");
      setIntroCycle((current) => current + 1);
    },
    [cars.length],
  );

  const finishIntro = useCallback(() => {
    setPhase("welcome");
  }, []);

  const finishWelcome = useCallback(() => {
    setPhase("catalog");
    setIndex((current) => {
      const nextIndex = pendingIndexRef.current;
      pendingIndexRef.current = null;
      return clampIndex(nextIndex ?? current, cars.length);
    });
  }, [cars.length]);

  const applyCars = useCallback((nextCars: DisplayCar[]) => {
    const currentSlug = currentSlugRef.current;
    const nextSignature = catalogSignature(nextCars);
    writeCatalogCache(nextCars);

    if (nextSignature === catalogSignatureRef.current) {
      return;
    }

    setCars(nextCars);
    if (nextCars.length > 0) {
      const preservedIndex = currentSlug ? nextCars.findIndex((car) => car.slug === currentSlug) : -1;
      setIndex((current) => {
        if (preservedIndex >= 0) return preservedIndex;
        return Math.min(current, nextCars.length - 1);
      });
    } else {
      setIndex(0);
      setPhase("loading");
    }
  }, []);

  const loadCars = useCallback(async () => {
    try {
      const response = await fetch("/api/catalog?pageSize=100", { cache: "no-store" });
      const payload = (await response.json()) as CatalogResponse;
      if (!response.ok || payload.success !== true || !Array.isArray(payload.cars)) {
        throw new Error("Catalog unavailable");
      }

      const active = payload.cars.filter((car) => car.status !== "hidden" && car.status !== "sold");
      const nextCars = active.length > 0 ? active : payload.cars.filter((car) => car.status !== "hidden");

      applyCars(nextCars);
      setError(false);
    } catch (catalogError) {
      console.error("Showroom display catalog failed", catalogError);
      setError(true);
    }
  }, [applyCars]);

  const warmAsset = useCallback((src: string) => {
    if (!src || warmedAssetsRef.current.has(src)) return;
    warmedAssetsRef.current.add(src);

    const preload = new window.Image();
    preload.decoding = "async";
    preload.loading = "eager";
    preload.src = src;
    if (typeof preload.decode === "function") {
      void preload.decode().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    void loadCars();
    const refresh = window.setInterval(() => void loadCars(), CATALOG_REFRESH_MS);
    return () => window.clearInterval(refresh);
  }, [loadCars]);

  useEffect(() => {
    if (cars.length === 0) return;

    const priorityUrls: string[] = [];
    const priorityCount = Math.min(8, cars.length);
    for (let offset = 0; offset < priorityCount; offset += 1) {
      const displayCar = cars[(index + offset) % cars.length];
      if (!displayCar) continue;
      priorityUrls.push(carImage(displayCar), displayAsset(displayCar, "light").src, qrUrl(displayCar.slug));
    }
    priorityUrls.forEach(warmAsset);

    const queue: string[] = [];
    for (const displayCar of cars) {
      const imageSrc = carImage(displayCar);
      const secondSrc = displayAsset(displayCar, "light").src;
      const qrSrc = qrUrl(displayCar.slug);
      if (!warmedAssetsRef.current.has(imageSrc)) queue.push(imageSrc);
      if (!warmedAssetsRef.current.has(secondSrc)) queue.push(secondSrc);
      if (!warmedAssetsRef.current.has(qrSrc)) queue.push(qrSrc);
    }

    if (queue.length === 0) return;

    let cancelled = false;
    let pointer = 0;
    let timeoutId: number | null = null;

    const pump = () => {
      if (cancelled) return;
      const chunkSize = 12;
      const end = Math.min(pointer + chunkSize, queue.length);
      for (; pointer < end; pointer += 1) {
        warmAsset(queue[pointer] ?? "");
      }
      if (pointer < queue.length) {
        timeoutId = window.setTimeout(pump, 120);
      }
    };

    timeoutId = window.setTimeout(pump, 40);

    return () => {
      cancelled = true;
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, [cars, index, warmAsset]);

  useEffect(() => {
    const clock = window.setInterval(() => setTime(new Date()), 15_000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    if (!modeReady) return;
    if (cars.length > 0 && phase === "loading") {
      startSequence(forcedSceneMode ?? "light", index);
    }
  }, [cars.length, forcedSceneMode, index, modeReady, phase, startSequence]);

  useEffect(() => {
    if (phase !== "intro") return;
    const introDuration = sceneMode === "dark" ? INTRO_FALLBACK_MS : 2_300;
    const fallback = window.setTimeout(() => finishIntro(), introDuration);
    return () => window.clearTimeout(fallback);
  }, [finishIntro, introCycle, phase, sceneMode]);

  useEffect(() => {
    if (phase !== "welcome") return;
    const welcomeTimer = window.setTimeout(() => finishWelcome(), WELCOME_DURATION_MS);
    return () => window.clearTimeout(welcomeTimer);
  }, [finishWelcome, phase]);

  useEffect(() => {
    if (phase !== "catalog" || cars.length === 0) return;
    const rotation = window.setTimeout(() => {
      if (index >= cars.length - 1) {
        const nextMode = forcedSceneMode ?? (sceneMode === "dark" ? "light" : "dark");
        startSequence(nextMode, 0);
        return;
      }
      setIndex((current) => clampIndex(current + 1, cars.length));
    }, ROTATION_MS);
    return () => window.clearTimeout(rotation);
  }, [cars.length, forcedSceneMode, index, phase, sceneMode, startSequence]);

  const car = cars[index] ?? null;
  const counter = useMemo(() => {
    if (!car || cars.length === 0) return "00 / 00";
    return `${pad(index + 1)} / ${pad(cars.length)}`;
  }, [car, cars.length, index]);

  const fullscreenLabel = isFullscreen ? "ВЫЙТИ ИЗ ПОЛНОГО ЭКРАНА" : "ПОЛНЫЙ ЭКРАН";
  const yearLine = car
    ? [car.year ? String(car.year) : null, car.engineText || normalizeFuel(car.fuelType)].filter(Boolean).join(" · ")
    : "";
  const country = car?.countryCode ? COUNTRY_LABELS[car.countryCode] ?? car.countryCode : null;
  const activeAsset = car ? displayAsset(car, sceneMode) : { src: "/intro-poster.jpg", flipped: false };
  const image = activeAsset.src;

  return (
    <main ref={rootRef} className={styles.displayRoot} data-scene-mode={sceneMode}>
      <div className={styles.texture} aria-hidden="true" />
      <div className={styles.ambientGlow} aria-hidden="true" />

      {phase === "catalog" && sceneMode === "dark" ? (
        <button
          type="button"
          className={styles.floatingFullscreenButton}
          data-tone={sceneMode}
          onClick={() => void toggleFullscreen()}
        >
          <span className={styles.fullscreenIcon} aria-hidden="true">
            {isFullscreen ? (
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M9 4H4v5M15 4h5v5M4 15v5h5M20 15v5h-5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" />
              </svg>
            )}
          </span>
          <span>{fullscreenLabel}</span>
        </button>
      ) : null}

      {fullscreenHint ? <div className={styles.fullscreenNotice}>{fullscreenHint}</div> : null}

      <AnimatePresence initial={false} mode="wait">
        {phase === "intro" ? (
          sceneMode === "dark" ? (
            <motion.section
              key={`intro-${sceneMode}-${introCycle}`}
              className={styles.introScene}
              initial={{ opacity: 0, scale: 1.004 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.998 }}
              transition={{ duration: 1.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <video
                key={`intro-video-${introCycle}`}
                className={styles.introVideo}
                autoPlay
                muted
                playsInline
                preload="auto"
                poster="/intro-poster.jpg"
                onEnded={finishIntro}
              >
                <source src="/intro.mp4" type="video/mp4" />
              </video>
              <div className={styles.introVeil} aria-hidden="true" />
              <div className={styles.introBrand}>
                <img src="/brand/asu-wordmark-white.png" alt="Auto Sale Umar" />
                <span>SHOWROOM DISPLAY</span>
                <strong>PREMIUM COLLECTION</strong>
              </div>
            </motion.section>
          ) : (
            <motion.section
              key={`intro-${sceneMode}-${introCycle}`}
              className={styles.lightIntroScene}
              initial={{ opacity: 0, scale: 1.004 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.998 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className={styles.lightIntroBrand}>
                <span>SHOWROOM DISPLAY</span>
              </div>
            </motion.section>
          )
        ) : phase === "welcome" ? (
          sceneMode === "dark" ? (
            <motion.section
              key={`welcome-${sceneMode}-${introCycle}`}
              className={styles.welcomeScene}
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 1 }}
            >
              <div className={styles.welcomeShade} aria-hidden="true" />
              <div className={styles.welcomeBlackout} aria-hidden="true" />

              <motion.div
                className={styles.welcomeRu}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.92, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              >
                <span>ДОБРО ПОЖАЛОВАТЬ</span>
                <strong>В ШОУРУМ</strong>
              </motion.div>

              <motion.img
                className={styles.welcomeLogo}
                src="/brand/asu-wordmark-white.png"
                alt="Auto Sale Umar"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.96 }}
                transition={{ delay: 1.22, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
            </motion.section>
          ) : (
            <motion.section
              key={`welcome-${sceneMode}-${introCycle}`}
              className={styles.lightWelcomeScene}
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 1 }}
            >
              <motion.div
                className={styles.lightWelcomeCopy}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24, duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
              >
                <span>ДОБРО ПОЖАЛОВАТЬ</span>
                <strong>В ШОУРУМ</strong>
              </motion.div>

              <motion.img
                className={styles.lightWelcomeLogo}
                src="/brand/asu-wordmark-black.png"
                alt="Auto Sale Umar"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.46, duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
              />
            </motion.section>
          )
        ) : !car ? (
          <motion.section
            key="loading"
            className={styles.loadingStage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <img className={styles.loadingLogo} src="/brand/asu-wordmark-white.png" alt="Auto Sale Umar" />
            <div className={styles.loadingCopy}>
              <span>SHOWROOM DISPLAY</span>
              <strong>{error ? "ОБНОВЛЯЕМ ДАННЫЕ" : "ЗАГРУЖАЕМ КОЛЛЕКЦИЮ"}</strong>
            </div>
          </motion.section>
        ) : sceneMode === "dark" ? (
          <motion.section
            className={styles.scene}
            key={`${sceneMode}-${car.id}-${car.slug}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.75, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className={styles.topBar}>
              <img src="/brand/asu-wordmark-white.png" alt="Auto Sale Umar" />
              <div className={styles.topBarRight}>
                <button
                  type="button"
                  className={styles.fullscreenButton}
                  data-supported={fullscreenSupported ? "true" : "false"}
                  data-tone={sceneMode}
                  onClick={() => void toggleFullscreen()}
                >
                  <span className={styles.fullscreenIcon} aria-hidden="true">
                    {isFullscreen ? (
                      <svg viewBox="0 0 24 24" focusable="false">
                        <path d="M9 4H4v5M15 4h5v5M4 15v5h5M20 15v5h-5" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" focusable="false">
                        <path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" />
                      </svg>
                    )}
                  </span>
                  <span>{fullscreenLabel}</span>
                </button>

                <div className={styles.displayMeta} data-tone={sceneMode}>
                  <span>SHOWROOM DISPLAY</span>
                  <i aria-hidden="true" />
                  <time>{formatTime(time)}</time>
                </div>
              </div>
            </header>

            <section className={styles.contentGrid}>
              <aside className={styles.infoPanel}>
                <div className={styles.selectionLabel}>ВЫБОР AUTO SALE UMAR</div>

                <div className={styles.identity}>
                  <span>{car.brand.toLocaleUpperCase("ru-RU")}</span>
                  <h1>{car.model.toLocaleUpperCase("ru-RU")}</h1>
                  {car.trim ? <p>{car.trim}</p> : null}
                </div>

                <div className={styles.yearLine}>{yearLine || "PREMIUM"}</div>
                <StatusPill status={car.status} />

                <div className={styles.price}>{formatPrice(car)}</div>

                <div className={styles.specGrid}>
                  <SpecCell value={normalizeFuel(car.fuelType)} />
                  <SpecCell value={normalizeDrive(car.driveType)} />
                  <SpecCell value={`${new Intl.NumberFormat("ru-RU").format(car.mileageKm || 0)} КМ`} />
                  <SpecCell value={country ?? compactTrim(car.trim)} />
                </div>

                <div className={styles.description}>{displayDescription(car)}</div>
              </aside>

              <div className={styles.visualCard}>
                <div className={styles.imageStage}>
                  <img
                    key={image}
                    className={styles.carImage}
                    src={image}
                    alt={`${car.brand} ${car.model}`}
                    loading="eager"
                    decoding="async"
                    onError={(event: SyntheticEvent<HTMLImageElement>) => {
                      const target = event.currentTarget;
                      if (!target.src.endsWith("/intro-poster.jpg")) target.src = "/intro-poster.jpg";
                    }}
                  />
                  <div className={styles.softSweep} aria-hidden="true" />
                </div>

                <a className={styles.qrCard} href={tvCarUrl(car.slug)}>
                  <div className={styles.qrWrap}>
                    <img src={qrUrl(car.slug)} alt={`QR ${car.brand} ${car.model}`} loading="eager" decoding="async" />
                  </div>
                  <div>
                    <strong>
                      ОТКРЫТЬ
                      <br />
                      АВТОМОБИЛЬ
                    </strong>
                    <span>Наведите камеру телефона</span>
                  </div>
                </a>
              </div>
            </section>

            <footer className={styles.footerBar}>
              <div className={styles.progressRail} aria-hidden="true">
                <span key={`${sceneMode}-${car.id}-progress`} />
              </div>
              <div className={styles.footerMeta}>
                <strong>{counter}</strong>
                <span>АВТОМОБИЛИ</span>
              </div>
            </footer>
          </motion.section>
        ) : (
          <motion.section
            className={`${styles.scene} ${styles.sceneLight}`}
            key={`${sceneMode}-${car.id}-${car.slug}`}
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 1 }}
          >
            <header className={`${styles.topBar} ${styles.topBarLight}`}>
              <img src="/brand/asu-wordmark-black.png" alt="Auto Sale Umar" />
              <div className={styles.topBarRight}>
                <button
                  type="button"
                  className={styles.fullscreenButton}
                  data-supported={fullscreenSupported ? "true" : "false"}
                  data-tone={sceneMode}
                  onClick={() => void toggleFullscreen()}
                >
                  <span className={styles.fullscreenIcon} aria-hidden="true">
                    {isFullscreen ? (
                      <svg viewBox="0 0 24 24" focusable="false">
                        <path d="M9 4H4v5M15 4h5v5M4 15v5h5M20 15v5h-5" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" focusable="false">
                        <path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" />
                      </svg>
                    )}
                  </span>
                  <span>{fullscreenLabel}</span>
                </button>
              </div>
            </header>

            <section className={styles.lightContent}>
              <div className={styles.lightStage}>
                <motion.div
                  className={styles.lightTextBlock}
                  initial={{ opacity: 0, x: -200 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    transition: { delay: 0.12, duration: 1.38, ease: [0.16, 1, 0.3, 1] },
                  }}
                  exit={{
                    opacity: 0,
                    x: 340,
                    transition: { delay: 0.12, duration: 1.18, ease: [0.4, 0, 0.2, 1] },
                  }}
                >
                  <div className={styles.selectionLabelLight}>AUTO SALE UMAR</div>
                  <div className={styles.lightIdentity}>
                    <h1>{`${car.brand} ${car.model}`}</h1>
                    {car.trim ? <p className={styles.lightTrim}>{car.trim}</p> : null}
                  </div>
                  <div className={styles.lightDescription}>{displayDescription(car)}</div>
                  <strong className={styles.lightPrice}>{formatPrice(car)}</strong>
                </motion.div>

                <motion.div
                  className={styles.lightVisualWrap}
                  initial={{ opacity: 0, x: -280 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    transition: { duration: 1.42, ease: [0.16, 1, 0.3, 1] },
                  }}
                  exit={{
                    opacity: 0,
                    x: 360,
                    transition: { duration: 1.2, ease: [0.4, 0, 0.2, 1] },
                  }}
                >
                  <img
                    key={`${image}-${activeAsset.flipped ? "flipped" : "plain"}`}
                    className={styles.lightCarImage}
                    style={{ transform: activeAsset.flipped ? "scaleX(-1)" : "none" }}
                    src={image}
                    alt={`${car.brand} ${car.model}`}
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                    onError={(event: SyntheticEvent<HTMLImageElement>) => {
                      const target = event.currentTarget;
                      if (!target.src.endsWith("/intro-poster.jpg")) target.src = "/intro-poster.jpg";
                    }}
                  />
                </motion.div>
              </div>
            </section>

            <footer className={`${styles.footerBar} ${styles.footerBarLight}`}>
              <div className={`${styles.progressRail} ${styles.progressRailLight}`} aria-hidden="true">
                <span key={`${sceneMode}-${car.id}-progress`} />
              </div>
            </footer>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}
