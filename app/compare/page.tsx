"use client";

import {
  ArrowLeftRight,
  Check,
  ChevronRight,
  ExternalLink,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from "react";
import PublicChrome, {
  type PublicLanguage,
  type PublicResolvedTheme,
  type PublicThemeMode,
} from "../_components/PublicChrome";
import { copyForLanguage, isPublicLanguage, publicContentLanguage, publicLocale, uiText } from "../_lib/public-language";
import styles from "./compare.module.css";

type CarStatus = "in_stock" | "in_showroom" | "in_transit" | "made_to_order" | "reserved" | "sold" | "hidden";
type Currency = "USD" | "UZS" | "EUR";
type AdviceCriterion =
  | "budget"
  | "status"
  | "comfort"
  | "performance"
  | "family"
  | "economy"
  | "technology"
  | "ownership"
  | "resale";
type AiAction = "advice" | "deep";

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

interface CompareCar {
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
  coverUrl: string | null;
  engineDisplacementL: number | null;
  horsepowerHp: number | null;
  torqueNm: number | null;
  acceleration0100: number | null;
  topSpeedKmh: number | null;
  fuelConsumptionL100: number | null;
  electricRangeKm: number | null;
  variants?: Variant[];
}

interface CatalogResponse {
  success?: boolean;
  error?: string;
  cars?: CompareCar[];
  car?: CompareCar;
}

interface Quota {
  limit: number;
  adviceUsed: number;
  adviceRemaining: number;
  deepUsed: number;
  deepRemaining: number;
}

interface AiResult {
  title: string;
  verdict: string;
  recommendedSlug: string | null;
  summary: string;
  reasons: string[];
  cautions: string[];
  bestFor: Array<{ slug: string; scenario: string }>;
  expandedRows: Array<{
    label: string;
    values: Array<{ slug: string; value: string }>;
    insight: string;
  }>;
  verificationNote: string;
  sources: Array<{ title: string; url: string }>;
}

interface AiResponse {
  success?: boolean;
  error?: string;
  code?: string;
  quota?: Quota;
  result?: AiResult;
}

const COPY = {
  ru: {
    loading: "Загружаем каталог",
    error: "Не удалось загрузить автомобили для сравнения.",
    kicker: "AUTO SALE UMAR · COMPARE",
    title: "Сравните не модели. Сравните конкретные автомобили.",
    intro: "Цена, статус и характеристики берутся из каталога Auto Sale Umar. Консультант подключается только когда вы просите совет или углублённое сравнение.",
    chooseKicker: "ВАШЕ СРАВНЕНИЕ",
    choose: "Выберите автомобили",
    chooseText: "Сравнивайте два или три опубликованных автомобиля из одной реальной базы.",
    add: "Добавить автомобиль",
    replace: "Заменить",
    remove: "Убрать",
    search: "Марка, модель или комплектация",
    noCars: "По этому запросу автомобилей нет.",
    tableKicker: "СРАВНЕНИЕ",
    tableTitle: "Разница видна сразу.",
    characteristic: "Характеристика",
    price: "Цена",
    status: "Статус",
    year: "Год",
    trim: "Комплектация",
    engine: "Двигатель",
    displacement: "Объём двигателя",
    power: "Мощность",
    torque: "Крутящий момент",
    acceleration: "0–100 км/ч",
    speed: "Макс. скорость",
    consumption: "Расход",
    range: "Запас хода",
    fuel: "Топливо",
    drive: "Привод",
    transmission: "Коробка",
    seats: "Мест",
    mileage: "Пробег",
    country: "Рынок поставки",
    exterior: "Цвет кузова",
    interior: "Цвет салона",
    emptyValue: "—",
    aiKicker: "AUTO SALE UMAR · КОНСУЛЬТАНТ",
    aiTitle: "Нужен вывод, а не ещё одна таблица?",
    aiText: "Укажите, что важно именно вам. Точные технические данные конкретного автомобиля проверяются системой на сервере и не раскрывают внутренние идентификаторы.",
    criteriaTitle: "В чём именно нужен совет?",
    budget: "Бюджет",
    statusCriterion: "Статус / имидж",
    comfort: "Комфорт",
    performance: "Динамика",
    family: "Семья / практичность",
    economy: "Экономичность",
    technology: "Технологии",
    ownership: "Владение",
    resale: "Перепродажа",
    maxBudget: "Максимальный бюджет",
    note: "Что ещё важно? Например: езжу с семьёй, хочу максимально тихий салон и не хочу сильно терять при перепродаже.",
    advice: "Получить совет",
    deep: "Сравнить подробнее",
    remaining: "осталось",
    free: "бесплатно",
    selectTwo: "Сначала выберите минимум два автомобиля.",
    chooseCriterion: "Для совета выберите хотя бы один критерий или напишите комментарий.",
    aiWorkingAdvice: "Консультант изучает автомобили и формирует совет…",
    aiWorkingDeep: "Консультант проверяет дополнительные данные и официальные источники…",
    recommended: "Рекомендация",
    reasons: "Почему",
    cautions: "Что учесть",
    bestFor: "Лучший сценарий",
    deeper: "Дополнительные различия",
    verification: "Проверка данных",
    sources: "Источники проверки",
    openCar: "Открыть автомобиль",
    pickerTitle: "Выберите автомобиль",
    pickerText: "Можно выбрать до трёх автомобилей.",
    done: "Готово",
    anonymous: "Бесплатные консультации привязаны к этому браузеру автоматически — аккаунт не нужен.",
    consultantUnavailable: "Консультант временно недоступен. Повторите попытку через несколько секунд.",
    adviceDemandUnavailable: "Получить совет на данный момент недоступно из-за высокого спроса.",
    deepDemandUnavailable: "Сравнить подробнее на данный момент недоступно из-за высокого спроса обслуживания клиентов.",
    in_showroom: "В шоуруме",
    in_stock: "В наличии",
    in_transit: "В пути",
    made_to_order: "Под заказ",
    reserved: "Резерв",
    sold: "Продан",
    hidden: "Скрыт",
    priceRequest: "Цена по запросу",
  },
  uz: {
    loading: "Katalog yuklanmoqda",
    error: "Solishtirish uchun avtomobillarni yuklab bo‘lmadi.",
    kicker: "AUTO SALE UMAR · COMPARE",
    title: "Modellarni emas. Aniq avtomobillarni solishtiring.",
    intro: "Narx, status va xususiyatlar Auto Sale Umar katalogidan olinadi. Maslahatchi faqat maslahat yoki chuqur solishtirish so‘ralganda ishga tushadi.",
    chooseKicker: "SIZNING SOLISHTIRISHINGIZ",
    choose: "Avtomobillarni tanlang",
    chooseText: "Bitta real bazadagi ikki yoki uchta e’lon qilingan avtomobilni solishtiring.",
    add: "Avtomobil qo‘shish",
    replace: "Almashtirish",
    remove: "Olib tashlash",
    search: "Marka, model yoki komplektatsiya",
    noCars: "Bu so‘rov bo‘yicha avtomobil topilmadi.",
    tableKicker: "SOLISHTIRISH",
    tableTitle: "Farq darhol ko‘rinadi.",
    characteristic: "Xususiyat",
    price: "Narx",
    status: "Status",
    year: "Yil",
    trim: "Komplektatsiya",
    engine: "Dvigatel",
    displacement: "Dvigatel hajmi",
    power: "Quvvat",
    torque: "Aylanish momenti",
    acceleration: "0–100 km/soat",
    speed: "Maks. tezlik",
    consumption: "Sarf",
    range: "Yurish zaxirasi",
    fuel: "Yoqilg‘i",
    drive: "Uzatma",
    transmission: "Quti",
    seats: "O‘rin",
    mileage: "Yurgan masofa",
    country: "Yetkazib berish bozori",
    exterior: "Kuzov rangi",
    interior: "Salon rangi",
    emptyValue: "—",
    aiKicker: "AUTO SALE UMAR · MASLAHATCHI",
    aiTitle: "Yana bir jadval emas, aniq xulosa kerakmi?",
    aiText: "Siz uchun nima muhimligini belgilang. Aniq avtomobilning texnik ma’lumotlari tizim tomonidan serverda tekshiriladi va ichki identifikatorlar oshkor qilinmaydi.",
    criteriaTitle: "Qaysi masalada maslahat kerak?",
    budget: "Budjet",
    statusCriterion: "Status / imij",
    comfort: "Qulaylik",
    performance: "Dinamika",
    family: "Oila / amaliylik",
    economy: "Tejamkorlik",
    technology: "Texnologiyalar",
    ownership: "Ekspluatatsiya",
    resale: "Qayta sotish",
    maxBudget: "Maksimal budjet",
    note: "Yana nima muhim? Masalan: oilam bilan yuraman, salon juda sokin bo‘lsin va qayta sotishda katta yo‘qotish istamayman.",
    advice: "Maslahat olish",
    deep: "Batafsil solishtirish",
    remaining: "qoldi",
    free: "bepul",
    selectTwo: "Avval kamida ikkita avtomobil tanlang.",
    chooseCriterion: "Maslahat uchun kamida bitta mezon tanlang yoki izoh yozing.",
    aiWorkingAdvice: "Maslahatchi avtomobillarni o‘rganib, maslahat tayyorlamoqda…",
    aiWorkingDeep: "Maslahatchi qo‘shimcha ma’lumotlar va rasmiy manbalarni tekshirmoqda…",
    recommended: "Tavsiya",
    reasons: "Nima uchun",
    cautions: "Nimani hisobga olish kerak",
    bestFor: "Eng mos ssenariy",
    deeper: "Qo‘shimcha farqlar",
    verification: "Ma’lumotlarni tekshirish",
    sources: "Tekshiruv manbalari",
    openCar: "Avtomobilni ochish",
    pickerTitle: "Avtomobilni tanlang",
    pickerText: "Uchtagacha avtomobil tanlash mumkin.",
    done: "Tayyor",
    anonymous: "Bepul maslahatlar avtomatik ravishda shu brauzerga bog‘lanadi — akkaunt kerak emas.",
    consultantUnavailable: "Maslahatchi vaqtincha ishlamayapti. Bir necha soniyadan keyin qayta urinib ko‘ring.",
    adviceDemandUnavailable: "Hozircha maslahat olish yuqori talab sababli vaqtincha mavjud emas.",
    deepDemandUnavailable: "Hozircha batafsil solishtirish mijozlarga xizmat ko‘rsatishga bo‘lgan yuqori talab sababli vaqtincha mavjud emas.",
    in_showroom: "Shourumda",
    in_stock: "Mavjud",
    in_transit: "Yo‘lda",
    made_to_order: "Buyurtma asosida",
    reserved: "Rezerv",
    sold: "Sotilgan",
    hidden: "Yashirilgan",
    priceRequest: "Narx so‘rov bo‘yicha",
  },
} as const;

const COUNTRY_NAMES = {
  ru: { US: "США", CA: "Канада", KR: "Корея", AE: "ОАЭ", DE: "Германия", GB: "Великобритания", AU: "Австралия", EU: "Европа" },
  uz: { US: "AQSH", CA: "Kanada", KR: "Koreya", AE: "BAA", DE: "Germaniya", GB: "Buyuk Britaniya", AU: "Avstraliya", EU: "Yevropa" },
} as const;

const CRITERIA: AdviceCriterion[] = [
  "budget",
  "status",
  "comfort",
  "performance",
  "family",
  "economy",
  "technology",
  "ownership",
  "resale",
];

const THINKING_STEPS: Record<"ru" | "uz", Record<AiAction, readonly string[]>> = {
  ru: {
    advice: [
      "Изучаю выбранные автомобили…",
      "Учитываю ваш бюджет и критерии…",
      "Сопоставляю комфорт, статус и владение…",
      "Проверяю ключевые различия…",
      "Формирую рекомендацию…",
    ],
    deep: [
      "Изучаю данные Auto Sale Umar…",
      "Проверяю официальные источники…",
      "Сопоставляю комплектации и характеристики…",
      "Проверяю различия конкретных автомобилей…",
      "Почти готово — формирую вывод…",
    ],
  },
  uz: {
    advice: [
      "Tanlangan avtomobillarni o‘rganmoqdaman…",
      "Budjet va mezonlaringizni hisobga olyapman…",
      "Qulaylik, status va egalikni solishtiryapman…",
      "Asosiy farqlarni tekshiryapman…",
      "Tavsiyani tayyorlayapman…",
    ],
    deep: [
      "Auto Sale Umar ma’lumotlarini o‘rganyapman…",
      "Rasmiy manbalarni tekshiryapman…",
      "Komplektatsiya va xususiyatlarni solishtiryapman…",
      "Aniq avtomobillar farqini tekshiryapman…",
      "Deyarli tayyor — xulosani tuzyapman…",
    ],
  },
};

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

function browserId(): string {
  const key = "asu-browser-id";
  try {
    const current = localStorage.getItem(key)?.trim();
    if (current && /^[A-Za-z0-9_-]{16,96}$/.test(current)) return current;
    const next = crypto.randomUUID().replaceAll("-", "");
    localStorage.setItem(key, next);
    return next;
  } catch {
    return crypto.randomUUID().replaceAll("-", "");
  }
}

function carImage(car: CompareCar): string {
  if (car.coverUrl) return car.coverUrl;
  for (const variant of car.variants ?? []) {
    const cover = variant.photos?.find((photo) => photo.isCover) ?? variant.photos?.[0];
    if (cover?.url) return cover.url;
  }
  return "/intro-poster.jpg";
}

function formatPrice(car: CompareCar, language: PublicLanguage): string {
  if (car.priceOnRequest || car.price == null) return copyForLanguage(COPY, language).priceRequest;
  const value = new Intl.NumberFormat(publicLocale(language), { maximumFractionDigits: 0 }).format(car.price);
  if (car.currency === "USD") return `${value} $`;
  if (car.currency === "EUR") return `${value} €`;
  return `${value} ${uiText(language, "сум", "so‘m")}`;
}

function statusLabel(status: CarStatus, language: PublicLanguage): string {
  return copyForLanguage(COPY, language)[status];
}

function countryLabel(code: string | null, language: PublicLanguage): string {
  if (!code) return copyForLanguage(COPY, language).emptyValue;
  return copyForLanguage(COUNTRY_NAMES, language)[code as keyof typeof COUNTRY_NAMES.ru] ?? code;
}

function criterionLabel(criterion: AdviceCriterion, language: PublicLanguage): string {
  const c = copyForLanguage(COPY, language);
  const map: Record<AdviceCriterion, string> = {
    budget: c.budget,
    status: c.statusCriterion,
    comfort: c.comfort,
    performance: c.performance,
    family: c.family,
    economy: c.economy,
    technology: c.technology,
    ownership: c.ownership,
    resale: c.resale,
  };
  return map[criterion];
}

export default function ComparePage() {
  const { language, themeMode, resolvedTheme, changeLanguage, changeTheme } = usePublicPreferences();
  const c = copyForLanguage(COPY, language);
  const [catalog, setCatalog] = useState<CompareCar[]>([]);
  const [details, setDetails] = useState<Record<string, CompareCar>>({});
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [pickerTarget, setPickerTarget] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [criteria, setCriteria] = useState<AdviceCriterion[]>([]);
  const [budget, setBudget] = useState("");
  const [budgetCurrency, setBudgetCurrency] = useState<Currency>("USD");
  const [note, setNote] = useState("");
  const [quota, setQuota] = useState<Quota | null>(null);
  const [aiAction, setAiAction] = useState<AiAction | null>(null);
  const [aiError, setAiError] = useState("");
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [typedVerdict, setTypedVerdict] = useState("");
  const [typedSummary, setTypedSummary] = useState("");
  const [typingDone, setTypingDone] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const id = browserId();

    Promise.all([
      fetch("/api/catalog?pageSize=100", { cache: "no-store", signal: controller.signal }),
      fetch("/api/compare-ai", {
        cache: "no-store",
        signal: controller.signal,
        headers: { "x-asu-browser-id": id, Accept: "application/json" },
      }),
    ])
      .then(async ([catalogResponse, quotaResponse]) => {
        const catalogBody = await catalogResponse.json() as CatalogResponse;
        if (!catalogResponse.ok || catalogBody.success !== true || !Array.isArray(catalogBody.cars)) {
          throw new Error(c.error);
        }

        const active = catalogBody.cars.filter((car) => car.status !== "hidden" && car.status !== "sold");
        setCatalog(active);

        const params = new URLSearchParams(window.location.search);
        const requested = (params.get("cars") || "")
          .split(",")
          .map((slug) => slug.trim())
          .filter((slug, index, values) => slug && values.indexOf(slug) === index)
          .filter((slug) => active.some((car) => car.slug === slug))
          .slice(0, 3);
        setSelectedSlugs(requested);

        if (quotaResponse.ok) {
          const quotaBody = await quotaResponse.json() as AiResponse;
          if (quotaBody.success && quotaBody.quota) setQuota(quotaBody.quota);
        }
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : c.error);
        setLoading(false);
      });

    return () => controller.abort();
  }, [c.error]);

  useEffect(() => {
    if (selectedSlugs.length === 0) return;
    const missing = selectedSlugs.filter((slug) => !details[slug]);
    if (missing.length === 0) return;

    let cancelled = false;
    Promise.all(missing.map(async (slug) => {
      const response = await fetch(`/api/catalog?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
      const body = await response.json() as CatalogResponse;
      if (!response.ok || body.success !== true || !body.car) return null;
      return body.car;
    })).then((cars) => {
      if (cancelled) return;
      const loadedCars = cars.filter((car): car is CompareCar => Boolean(car));
      if (loadedCars.length) {
        setDetails((current) => {
          const next = { ...current };
          for (const car of loadedCars) next[car.slug] = car;
          return next;
        });
      }
      const loadedSlugs = new Set(loadedCars.map((car) => car.slug));
      const failedSlugs = missing.filter((slug) => !loadedSlugs.has(slug));
      if (failedSlugs.length) {
        setSelectedSlugs((current) => current.filter((slug) => !failedSlugs.includes(slug)));
      }
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [details, selectedSlugs]);

  useEffect(() => {
    if (loading) return;
    const url = new URL(window.location.href);
    if (selectedSlugs.length) url.searchParams.set("cars", selectedSlugs.join(","));
    else url.searchParams.delete("cars");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [loading, selectedSlugs]);

  useEffect(() => {
    if (pickerTarget == null) return;
    const previous = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPickerTarget(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [pickerTarget]);

  useEffect(() => {
    if (!aiAction) {
      setThinkingStep(0);
      return;
    }
    const steps = copyForLanguage(THINKING_STEPS, language)[aiAction];
    setThinkingStep(0);
    const timer = window.setInterval(() => {
      setThinkingStep((current) => Math.min(current + 1, steps.length - 1));
    }, 1550);
    return () => window.clearInterval(timer);
  }, [aiAction, language]);

  useEffect(() => {
    if (!aiResult) {
      setTypedVerdict("");
      setTypedSummary("");
      setTypingDone(true);
      return;
    }

    const verdict = aiResult.verdict || "";
    const summary = aiResult.summary || "";
    let verdictIndex = 0;
    let summaryIndex = 0;
    setTypedVerdict("");
    setTypedSummary("");
    setTypingDone(false);

    const timer = window.setInterval(() => {
      if (verdictIndex < verdict.length) {
        verdictIndex = Math.min(verdict.length, verdictIndex + 3);
        setTypedVerdict(verdict.slice(0, verdictIndex));
        return;
      }
      if (summaryIndex < summary.length) {
        summaryIndex = Math.min(summary.length, summaryIndex + 4);
        setTypedSummary(summary.slice(0, summaryIndex));
        return;
      }
      setTypingDone(true);
      window.clearInterval(timer);
    }, 18);

    return () => window.clearInterval(timer);
  }, [aiResult]);

  const selectedCars = useMemo(() => selectedSlugs.map((slug) => details[slug] ?? catalog.find((car) => car.slug === slug)).filter((car): car is CompareCar => Boolean(car)), [catalog, details, selectedSlugs]);
  const selectedSet = useMemo(() => new Set(selectedSlugs), [selectedSlugs]);
  const pickerCars = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(publicLocale(language));
    return catalog.filter((car) => {
      if (!query) return true;
      return `${car.brand} ${car.model} ${car.trim ?? ""} ${car.year ?? ""}`.toLocaleLowerCase(publicLocale(language)).includes(query);
    });
  }, [catalog, language, search]);

  const tableRows = useMemo(() => {
    const empty = c.emptyValue;
    const km = (value: number | null | undefined) => value == null ? empty : `${new Intl.NumberFormat(publicLocale(language)).format(value)} ${uiText(language, "км", "km")}`;
    return [
      { label: c.price, value: (car: CompareCar) => formatPrice(car, language) },
      { label: c.status, value: (car: CompareCar) => statusLabel(car.status, language) },
      { label: c.year, value: (car: CompareCar) => car.year ? String(car.year) : empty },
      { label: c.trim, value: (car: CompareCar) => car.trim || empty },
      { label: c.engine, value: (car: CompareCar) => car.engineText || empty },
      { label: c.displacement, value: (car: CompareCar) => car.engineDisplacementL != null ? `${car.engineDisplacementL} ${uiText(language, "л", "l")}` : empty },
      { label: c.power, value: (car: CompareCar) => car.horsepowerHp != null ? `${car.horsepowerHp} ${uiText(language, "л.с.", "o.k.")}` : empty },
      { label: c.torque, value: (car: CompareCar) => car.torqueNm != null ? `${car.torqueNm} ${uiText(language, "Н·м", "N·m")}` : empty },
      { label: c.acceleration, value: (car: CompareCar) => car.acceleration0100 != null ? `${car.acceleration0100} ${uiText(language, "с", "s")}` : empty },
      { label: c.speed, value: (car: CompareCar) => car.topSpeedKmh != null ? `${car.topSpeedKmh} ${uiText(language, "км/ч", "km/soat")}` : empty },
      { label: c.consumption, value: (car: CompareCar) => car.fuelConsumptionL100 != null ? `${car.fuelConsumptionL100} ${uiText(language, "л/100 км", "l/100 km")}` : empty },
      { label: c.range, value: (car: CompareCar) => car.electricRangeKm != null ? `${car.electricRangeKm} ${uiText(language, "км", "km")}` : empty },
      { label: c.fuel, value: (car: CompareCar) => car.fuelType || empty },
      { label: c.drive, value: (car: CompareCar) => car.driveType || empty },
      { label: c.transmission, value: (car: CompareCar) => car.transmission || empty },
      { label: c.seats, value: (car: CompareCar) => car.seats != null ? String(car.seats) : empty },
      { label: c.mileage, value: (car: CompareCar) => km(car.mileageKm) },
      { label: c.country, value: (car: CompareCar) => countryLabel(car.countryCode, language) },
      { label: c.exterior, value: (car: CompareCar) => car.exteriorColor || car.variants?.[0]?.exteriorColorName || empty },
      { label: c.interior, value: (car: CompareCar) => car.interiorColor || car.variants?.[0]?.interiorColorName || empty },
    ];
  }, [c, language]);

  function chooseCar(slug: string) {
    if (pickerTarget == null) return;
    setSelectedSlugs((current) => {
      const next = [...current];
      const existingIndex = next.indexOf(slug);
      if (existingIndex >= 0 && existingIndex !== pickerTarget) return current;
      if (pickerTarget < next.length) next[pickerTarget] = slug;
      else if (next.length < 3) next.push(slug);
      return next.filter((value, index, values) => values.indexOf(value) === index).slice(0, 3);
    });
    setPickerTarget(null);
    setSearch("");
    setAiResult(null);
    setAiError("");
  }

  function removeCar(index: number) {
    setSelectedSlugs((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setAiResult(null);
    setAiError("");
  }

  function toggleCriterion(criterion: AdviceCriterion) {
    setCriteria((current) => current.includes(criterion) ? current.filter((item) => item !== criterion) : [...current, criterion]);
  }

  async function runAi(action: AiAction) {
    if (selectedSlugs.length < 2) {
      setAiError(c.selectTwo);
      return;
    }
    if (action === "advice" && criteria.length === 0 && !note.trim()) {
      setAiError(c.chooseCriterion);
      return;
    }
    if (action === "advice" && quota?.adviceRemaining === 0) return;
    if (action === "deep" && quota?.deepRemaining === 0) return;

    setAiAction(action);
    setAiError("");
    setAiResult(null);
    setTypedVerdict("");
    setTypedSummary("");
    setTypingDone(true);
    try {
      const response = await fetch("/api/compare-ai", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Accept: "application/json",
          "x-asu-browser-id": browserId(),
        },
        body: JSON.stringify({
          action,
          slugs: selectedSlugs,
          criteria,
          note: note.trim(),
          budget: budget.trim() ? Number(budget) : null,
          budgetCurrency,
          language: publicContentLanguage(language),
        }),
      });
      const raw = await response.text();
      let body: AiResponse | null = null;
      try {
        body = JSON.parse(raw) as AiResponse;
      } catch {
        body = null;
      }
      if (body?.quota) setQuota(body.quota);
      if (!response.ok || !body?.success || !body.result) throw new Error(c.consultantUnavailable);
      setAiResult(body.result);
    } catch {
      setAiError(c.consultantUnavailable);
    } finally {
      setAiAction(null);
    }
  }

  if (loading) {
    return (
      <main className={styles.statePage} data-theme={resolvedTheme}>
        <PublicChrome language={language} themeMode={themeMode} resolvedTheme={resolvedTheme} backHref="/" onLanguageChange={changeLanguage} onThemeChange={changeTheme} />
        <div className={styles.stateCard}><span className={styles.loader} /><strong>{c.loading}</strong></div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className={styles.statePage} data-theme={resolvedTheme}>
        <PublicChrome language={language} themeMode={themeMode} resolvedTheme={resolvedTheme} backHref="/" onLanguageChange={changeLanguage} onThemeChange={changeTheme} />
        <div className={styles.stateCard}><strong>{loadError || c.error}</strong><a href="/">Auto Sale Umar<ChevronRight /></a></div>
      </main>
    );
  }

  const carCountStyle = { "--car-count": Math.max(2, selectedCars.length) } as CSSProperties;
  const selectionSlots = Math.max(1, Math.min(3, selectedCars.length + (selectedSlugs.length < 3 ? 1 : 0)));
  const selectionRailStyle = { "--slot-count": selectionSlots } as CSSProperties;

  return (
    <main className={styles.page} data-theme={resolvedTheme}>
      <PublicChrome language={language} themeMode={themeMode} resolvedTheme={resolvedTheme} backHref="/" onLanguageChange={changeLanguage} onThemeChange={changeTheme} />

      <section className={styles.hero}>
        <div className={styles.heroOrb} aria-hidden="true" />
        <span className={styles.kicker}><ArrowLeftRight />{c.kicker}</span>
        <h1>{c.title}</h1>
        <p>{c.intro}</p>
      </section>

      <section className={styles.selectionSection}>
        <div className={styles.sectionHeading}>
          <div><span>{c.chooseKicker}</span><h2>{c.choose}</h2></div>
          <p>{c.chooseText}</p>
        </div>

        <div className={styles.selectedRail} style={selectionRailStyle}>
          {selectedCars.map((car, index) => (
            <article className={styles.selectedCard} key={car.slug}>
              <div className={styles.selectedImage}>
                <img src={carImage(car)} alt={`${car.brand} ${car.model}`} />
                <span data-status={car.status}>{statusLabel(car.status, language)}</span>
              </div>
              <div className={styles.selectedCopy}>
                <small>{car.year || "AUTO SALE UMAR"}</small>
                <h3>{car.brand}<br />{car.model}</h3>
                <p>{car.trim || c.emptyValue}</p>
                <strong>{formatPrice(car, language)}</strong>
              </div>
              <div className={styles.selectedActions}>
                <button type="button" onClick={() => setPickerTarget(index)}>{c.replace}</button>
                <button type="button" onClick={() => removeCar(index)} aria-label={c.remove}><X /></button>
              </div>
            </article>
          ))}

          {selectedSlugs.length < 3 ? (
            <button className={styles.addCard} type="button" onClick={() => setPickerTarget(selectedSlugs.length)}>
              <span><Plus /></span>
              <strong>{c.add}</strong>
              <small>{selectedSlugs.length === 0 ? "01" : selectedSlugs.length === 1 ? "02" : "03"}</small>
            </button>
          ) : null}
        </div>
      </section>

      {selectedCars.length >= 2 ? (
        <section className={styles.tableSection}>
          <div className={styles.sectionHeading}>
            <div><span>{c.tableKicker}</span><h2>{c.tableTitle}</h2></div>
          </div>

          <div className={styles.tableScroll}>
            <div className={styles.compareTable} style={carCountStyle}>
              <div className={`${styles.tableCell} ${styles.tableHeaderCell}`}>{c.characteristic}</div>
              {selectedCars.map((car) => <div className={`${styles.tableCell} ${styles.tableHeaderCar}`} key={`head-${car.slug}`}><b>{car.brand}</b><span>{car.model}</span></div>)}
              {tableRows.flatMap((row) => [
                <div className={`${styles.tableCell} ${styles.tableLabel}`} key={`${row.label}-label`}>{row.label}</div>,
                ...selectedCars.map((car) => <div className={styles.tableCell} key={`${row.label}-${car.slug}`}>{row.value(car)}</div>),
              ])}
            </div>
          </div>
        </section>
      ) : null}

      <section className={styles.aiSection}>
        <div className={styles.aiCard}>
          <div className={styles.aiGlow} aria-hidden="true" />
          <div className={styles.aiIntro}>
            <span><Sparkles />{c.aiKicker}</span>
            <h2>{c.aiTitle}</h2>
            <p>{c.aiText}</p>
            <small>{c.anonymous}</small>
          </div>

          <div className={styles.aiControls}>
            <div className={styles.criteriaBlock}>
              <strong>{c.criteriaTitle}</strong>
              <div className={styles.criteriaGrid}>
                {CRITERIA.map((criterion) => (
                  <button type="button" data-active={criteria.includes(criterion)} onClick={() => toggleCriterion(criterion)} key={criterion}>
                    {criteria.includes(criterion) ? <Check /> : null}
                    {criterionLabel(criterion, language)}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.userContext}>
              <label className={styles.budgetField}>
                <span>{c.maxBudget}</span>
                <div>
                  <input inputMode="numeric" type="number" min="0" step="1000" value={budget} onChange={(event: ChangeEvent<HTMLInputElement>) => setBudget(event.target.value)} placeholder="150000" />
                  <select value={budgetCurrency} onChange={(event: ChangeEvent<HTMLSelectElement>) => setBudgetCurrency(event.target.value as Currency)} aria-label={c.maxBudget}>
                    <option value="USD">USD</option>
                    <option value="UZS">UZS</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </label>
              <label className={styles.noteField}>
                <span>{c.note}</span>
                <textarea maxLength={700} value={note} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setNote(event.target.value)} placeholder={c.note} />
              </label>
            </div>

            {aiError ? <div className={styles.aiError}>{aiError}</div> : null}
            {selectedCars.length < 2 ? <div className={styles.aiHint}>{c.selectTwo}</div> : null}

            {aiAction ? (
              <div className={styles.consultantThinking} aria-live="polite">
                <span className={styles.thinkingMark}><Sparkles /></span>
                <div>
                  <small>AUTO SALE UMAR · {uiText(language, "КОНСУЛЬТАНТ", "MASLAHATCHI")}</small>
                  <strong key={`${aiAction}-${thinkingStep}`}>{copyForLanguage(THINKING_STEPS, language)[aiAction][thinkingStep]}</strong>
                </div>
                <span className={styles.thinkingDots} aria-hidden="true"><i /><i /><i /></span>
              </div>
            ) : null}

            <div className={styles.aiButtons}>
              <div className={styles.aiButtonGroup}>
                <button type="button" disabled aria-disabled="true">
                  <span><Sparkles />{c.advice}</span>
                  <small>{uiText(language, "Недоступно", "Mavjud emas")}</small>
                </button>
                <p className={styles.aiUnavailableNote}>{c.adviceDemandUnavailable}</p>
              </div>
              <div className={styles.aiButtonGroup}>
                <button type="button" disabled aria-disabled="true">
                  <span><Search />{c.deep}</span>
                  <small>{uiText(language, "Недоступно", "Mavjud emas")}</small>
                </button>
                <p className={styles.aiUnavailableNote}>{c.deepDemandUnavailable}</p>
              </div>
            </div>
          </div>

          {aiResult ? (
            <article className={styles.aiResult}>
              <div className={styles.resultHeading}>
                <span>{c.recommended}</span>
                <h3>{aiResult.title}</h3>
                <p className={typedVerdict.length < aiResult.verdict.length ? styles.typingText : undefined}>{typedVerdict}</p>
                {aiResult.recommendedSlug ? (
                  <a href={`/car/?slug=${encodeURIComponent(aiResult.recommendedSlug)}`}>{c.openCar}<ChevronRight /></a>
                ) : null}
              </div>

              {aiResult.summary ? <p className={`${styles.resultSummary} ${typedVerdict.length >= aiResult.verdict.length && typedSummary.length < aiResult.summary.length ? styles.typingText : ""}`}>{typedSummary}</p> : null}

              {typingDone && aiResult.reasons.length ? (
                <div className={styles.resultBlock}><strong>{c.reasons}</strong><ul>{aiResult.reasons.map((item, index) => <li key={`reason-${index}`}>{item}</li>)}</ul></div>
              ) : null}

              {typingDone && aiResult.bestFor.length ? (
                <div className={styles.bestForGrid}>
                  {aiResult.bestFor.map((item, index) => {
                    const match = selectedCars.find((car) => car.slug === item.slug);
                    return <div key={`${item.slug}-${index}`}><small>{match ? `${match.brand} ${match.model}` : item.slug}</small><p>{item.scenario}</p></div>;
                  })}
                </div>
              ) : null}

              {typingDone && aiResult.expandedRows.length ? (
                <div className={styles.expandedComparison}>
                  <strong>{c.deeper}</strong>
                  {aiResult.expandedRows.map((row, index) => (
                    <div className={styles.expandedRow} key={`${row.label}-${index}`}>
                      <h4>{row.label}</h4>
                      <div>
                        {row.values.map((value) => {
                          const match = selectedCars.find((car) => car.slug === value.slug);
                          return <p key={`${row.label}-${value.slug}`}><b>{match ? `${match.brand} ${match.model}` : value.slug}</b><span>{value.value}</span></p>;
                        })}
                      </div>
                      <small>{row.insight}</small>
                    </div>
                  ))}
                </div>
              ) : null}

              {typingDone && aiResult.cautions.length ? (
                <div className={styles.resultBlock}><strong>{c.cautions}</strong><ul>{aiResult.cautions.map((item, index) => <li key={`caution-${index}`}>{item}</li>)}</ul></div>
              ) : null}

              {typingDone && aiResult.verificationNote ? (
                <div className={styles.verification}><strong>{c.verification}</strong><p>{aiResult.verificationNote}</p></div>
              ) : null}

              {typingDone && aiResult.sources.length ? (
                <div className={styles.sources}>
                  <strong>{c.sources}</strong>
                  <div>{aiResult.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.title}<ExternalLink /></a>)}</div>
                </div>
              ) : null}
            </article>
          ) : null}
        </div>
      </section>

      <footer className={styles.footer}>
        <img src={resolvedTheme === "dark" ? "/brand/asu-wordmark-white.png" : "/brand/asu-wordmark-black.png"} alt="Auto Sale Umar" />
        <span>Compare with precision.</span>
      </footer>

      <button className={styles.pickerBackdrop} data-open={pickerTarget != null} type="button" onClick={() => setPickerTarget(null)} aria-label={c.done} />
      <aside className={styles.picker} data-open={pickerTarget != null} aria-hidden={pickerTarget == null}>
        <div className={styles.pickerHandle} aria-hidden="true" />
        <header>
          <div><span>{c.pickerTitle}</span><p>{c.pickerText}</p></div>
          <button type="button" onClick={() => setPickerTarget(null)} aria-label={c.done}><X /></button>
        </header>
        <label className={styles.searchField}><Search /><input value={search} onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)} placeholder={c.search} /></label>
        <div className={styles.pickerList}>
          {pickerCars.map((car) => {
            const alreadySelected = selectedSet.has(car.slug) && selectedSlugs[pickerTarget ?? -1] !== car.slug;
            return (
              <button type="button" disabled={alreadySelected} onClick={() => chooseCar(car.slug)} key={car.slug}>
                <img src={carImage(car)} alt="" />
                <span><small>{car.year || statusLabel(car.status, language)}</small><b>{car.brand} {car.model}</b><em>{car.trim || formatPrice(car, language)}</em></span>
                {alreadySelected ? <Check /> : <ChevronRight />}
              </button>
            );
          })}
          {pickerCars.length === 0 ? <p className={styles.noCars}>{c.noCars}</p> : null}
        </div>
      </aside>
    </main>
  );
}
