"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "./new-car.module.css";
import AdminChrome from "../../_components/AdminChrome";
import { compressImageForUpload } from "../../../_lib/compress-image";

type Theme = "light" | "dark";
type Language = "ru" | "uz";
type CarStatus = "in_stock" | "in_showroom" | "in_transit" | "made_to_order" | "reserved";
type Currency = "USD" | "UZS" | "EUR";
type PhotoGroup = "exterior" | "interior" | "detail";

type ViewTransitionDocument = Document & {
  startViewTransition?: (updateCallback: () => void) => {
    ready: Promise<void>;
    finished: Promise<void>;
  };
};

interface PhotoDraft {
  id: string;
  file: File;
  previewUrl: string;
}

interface VariantDraft {
  localId: string;
  exteriorSwatch: string;
  exteriorColorName: string;
  interiorSwatch: string;
  interiorColorName: string;
  vin: string;
  stockNumber: string;
  quantity: string;
  exteriorPhotos: PhotoDraft[];
  interiorPhotos: PhotoDraft[];
  detailPhotos: PhotoDraft[];
}

interface FormState {
  brand: string;
  model: string;
  year: string;
  trim: string;
  status: CarStatus;
  countryCode: string;
  arrivalDate: string;
  isNew: boolean;
  mileageKm: string;

  engineText: string;
  engineDisplacementL: string;
  fuelType: string;
  driveType: string;
  transmission: string;
  seats: string;
  horsepowerHp: string;
  torqueNm: string;
  acceleration0100: string;
  topSpeedKmh: string;
  fuelConsumptionL100: string;
  electricRangeKm: string;

  price: string;
  currency: Currency;
  priceOnRequest: boolean;
  instagramUrl: string;

  shortDescriptionRu: string;
  shortDescriptionUz: string;
  descriptionRu: string;
  descriptionUz: string;

  isPublic: boolean;
  isFeatured: boolean;
}

interface CreateCarResponse {
  success?: boolean;
  error?: string;
  message?: string;
  car?: {
    id?: number;
    brand?: string;
    model?: string;
    variants?: Array<{ id: number; index: number }>;
  };
}

interface MediaResponse {
  success?: boolean;
  error?: string;
}

interface MeResponse {
  success?: boolean;
  error?: string;
  user?: {
    role?: "super_admin" | "admin" | "sales_manager";
  };
}

interface AiVariantResult {
  exteriorColorName?: string | null;
  exteriorSwatch?: string | null;
  interiorColorName?: string | null;
  interiorSwatch?: string | null;
  vin?: string | null;
  stockNumber?: string | null;
  quantity?: number | null;
}

interface AiCarResult {
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  trim?: string | null;
  status?: CarStatus | null;
  countryCode?: string | null;
  arrivalDate?: string | null;
  isNew?: boolean | null;
  mileageKm?: number | null;
  engineText?: string | null;
  engineDisplacementL?: number | null;
  fuelType?: string | null;
  driveType?: string | null;
  transmission?: string | null;
  seats?: number | null;
  horsepowerHp?: number | null;
  torqueNm?: number | null;
  acceleration0100?: number | null;
  topSpeedKmh?: number | null;
  fuelConsumptionL100?: number | null;
  electricRangeKm?: number | null;
  price?: number | null;
  currency?: Currency | null;
  priceOnRequest?: boolean | null;
  instagramUrl?: string | null;
  shortDescriptionRu?: string | null;
  shortDescriptionUz?: string | null;
  descriptionRu?: string | null;
  descriptionUz?: string | null;
  variants?: AiVariantResult[];
  warnings?: string[];
}

interface AiAutofillResponse {
  success?: boolean;
  error?: string;
  model?: string;
  car?: AiCarResult;
}

const BRANDS = [
  { value: "Mercedes-Benz", logo: "/brands/mercedes-benz.jpg" },
  { value: "Range Rover", logo: "/brands/range-rover.png" },
  { value: "Rolls-Royce", logo: "/brands/rolls-royce.png" },
  { value: "Cadillac", logo: "/brands/cadillac.png" },
  { value: "Lexus", logo: "/brands/lexus.png" },
  { value: "Toyota", logo: "/brands/toyota.png" },
  { value: "Genesis", logo: "/brands/genesis.png" },
  { value: "BMW", logo: "/brands/bmw.png" },
  { value: "Lamborghini", logo: "/brands/lamborghini.png" },
  { value: "Porsche", logo: "/brands/porsche.png" },
] as const;

const STATUS_OPTIONS: Array<{ value: CarStatus; label: Record<Language, string> }> = [
  { value: "in_stock", label: { ru: "В наличии", uz: "Mavjud" } },
  { value: "in_showroom", label: { ru: "В шоуруме", uz: "Shourumda" } },
  { value: "in_transit", label: { ru: "В пути", uz: "Yo‘lda" } },
  { value: "reserved", label: { ru: "Резерв", uz: "Band qilingan" } },
  { value: "made_to_order", label: { ru: "Под заказ", uz: "Buyurtma asosida" } },
];

const COUNTRY_OPTIONS = [
  { value: "KR", label: { ru: "Корея", uz: "Koreya" } },
  { value: "US", label: { ru: "США", uz: "AQSh" } },
  { value: "CA", label: { ru: "Канада", uz: "Kanada" } },
  { value: "AE", label: { ru: "ОАЭ", uz: "BAA" } },
  { value: "AU", label: { ru: "Австралия", uz: "Avstraliya" } },
  { value: "EU", label: { ru: "Европа", uz: "Yevropa" } },
  { value: "DE", label: { ru: "Германия", uz: "Germaniya" } },
  { value: "GB", label: { ru: "Великобритания", uz: "Buyuk Britaniya" } },
  { value: "JP", label: { ru: "Япония", uz: "Yaponiya" } },
  { value: "CN", label: { ru: "Китай", uz: "Xitoy" } },
  { value: "SA", label: { ru: "Саудовская Аравия", uz: "Saudiya Arabistoni" } },
  { value: "QA", label: { ru: "Катар", uz: "Qatar" } },
  { value: "CH", label: { ru: "Швейцария", uz: "Shveytsariya" } },
] as const;

const EXTERIOR_SWATCHES = [
  { value: "#111214", label: "Black" },
  { value: "#f4f4f0", label: "White" },
  { value: "#7b7e82", label: "Gray" },
  { value: "#b7bbc0", label: "Silver" },
  { value: "#193b73", label: "Blue" },
  { value: "#7f2024", label: "Red" },
  { value: "#2c4738", label: "Green" },
  { value: "#5f493b", label: "Brown" },
] as const;

const INTERIOR_SWATCHES = [
  { value: "#111214", label: "Black" },
  { value: "#ece9df", label: "Ivory" },
  { value: "#c7ad86", label: "Beige" },
  { value: "#68483a", label: "Brown" },
  { value: "#7d2828", label: "Red" },
  { value: "#9b5c31", label: "Orange" },
  { value: "#73767a", label: "Gray" },
] as const;

const UZ_COPY: Record<string, string> = {
  "Не удалось проверить защищённую сессию.": "Himoyalangan sessiyani tekshirib bo‘lmadi.",
  "У вашей роли нет права добавлять автомобили.": "Sizning rolingizga avtomobil qo‘shish huquqi berilmagan.",
  "Выберите марку автомобиля.": "Avtomobil brendini tanlang.",
  "Укажите модель автомобиля.": "Avtomobil modelini kiriting.",
  "Проверьте год автомобиля.": "Avtomobil yilini tekshiring.",
  "Проверьте дату прибытия.": "Yetib kelish sanasini tekshiring.",
  "Проверьте пробег.": "Yurgan masofani tekshiring.",
  "Проверьте количество мест.": "O‘rindiqlar sonini tekshiring.",
  "Цена должна быть целым положительным числом.": "Narx musbat butun son bo‘lishi kerak.",
  "Добавьте хотя бы одну фотографию кузова перед публикацией.": "E’lon qilishdan oldin kuzovning kamida bitta suratini qo‘shing.",
  "Проверьте ссылку Instagram.": "Instagram havolasini tekshiring.",
  "Укажите VIN корректно или оставьте поле пустым.": "VIN ni to‘g‘ri kiriting yoki maydonni bo‘sh qoldiring.",
  "Не удалось добавить автомобиль.": "Avtomobilni qo‘shib bo‘lmadi.",
  "Не удалось загрузить фотографии.": "Suratlarni yuklab bo‘lmadi.",
  "D1 не подтвердил ID созданного автомобиля.": "D1 yaratilgan avtomobil ID raqamini tasdiqlamadi.",
  "Проверка сессии": "Sessiya tekshirilmoqda",
  "Назад к автомобилям": "Avtomobillarga qaytish",
  "Открыть настройки": "Sozlamalarni ochish",
  "Закрыть настройки": "Sozlamalarni yopish",
  "Настройки": "Sozlamalar",
  "Выберите оформление и язык": "Ko‘rinish va tilni tanlang",
  "Оформление": "Ko‘rinish",
  "Светлая": "Yorug‘",
  "Тёмная": "Tungi",
  "Язык": "Til",
  "Настройки сохраняются автоматически": "Sozlamalar avtomatik saqlanadi",
  "Вернуться на сайт": "Saytga qaytish",
  "CONTROL SYSTEM · АВТОМОБИЛИ": "CONTROL SYSTEM · AVTOMOBILLAR",
  "Новый автомобиль": "Yangi avtomobil",
  "Быстрая форма: основные данные один раз, цвета и фотографии — отдельными вариантами.": "Tezkor shakl: asosiy ma’lumotlar bir marta, ranglar va suratlar esa alohida variantlarda.",
  "Умное автозаполнение": "Aqlli avtomatik to‘ldirish",
  "Вставьте характеристики, дилерский лист, invoice или большой текст — система разложит найденные данные по полям формы.": "Xususiyatlar, diler varaqasi, invoice yoki katta matnni kiriting — tizim topilgan ma’lumotlarni forma maydonlariga ajratadi.",
  "Вставить текст автомобиля": "Avtomobil matnini kiriting",
  "Можно вставить 10–15 страниц текста. Система не сохраняет автомобиль сама — поля останутся редактируемыми.": "10–15 sahifagacha matn kiritish mumkin. Tizim avtomobilni o‘zi saqlamaydi — maydonlar tahrirlanadigan bo‘lib qoladi.",
  "Проанализировать и заполнить": "Tahlil qilish va to‘ldirish",
  "Анализируем…": "Tahlil qilinmoqda…",
  "Очистить": "Tozalash",
  "Автозаполнение завершено": "Avtomatik to‘ldirish yakunlandi",
  "Проверьте значения перед сохранением.": "Saqlashdan oldin qiymatlarni tekshiring.",
  "Предупреждения автозаполнения": "Avtomatik to‘ldirish ogohlantirishlari",
  "Не удалось выполнить автозаполнение.": "Avtomatik to‘ldirishni bajarib bo‘lmadi.",
  "Вставьте текст с данными автомобиля.": "Avtomobil ma’lumotlari yozilgan matnni kiriting.",
  "Автомобиль": "Avtomobil",
  "Сначала выберите марку, затем укажите модель.": "Avval brendni tanlang, keyin modelni kiriting.",
  "Марка автомобиля": "Avtomobil brendi",
  "Марка": "Brend",
  "Выберите выше": "Yuqoridan tanlang",
  "Модель *": "Model *",
  "Комплектация": "Komplektatsiya",
  "Год": "Yil",
  "Состояние": "Holati",
  "Новый": "Yangi",
  "С пробегом": "Yurgan",
  "Поставка": "Yetkazib berish",
  "Статус управляет полями формы: дата прибытия показывается только когда она имеет смысл.": "Holat shakldagi maydonlarni boshqaradi: yetib kelish sanasi faqat kerak bo‘lganda ko‘rsatiladi.",
  "Статус": "Holat",
  "Страна поставки": "Yetkazib beruvchi davlat",
  "Ожидаемая дата прибытия": "Kutilayotgan yetib kelish sanasi",
  "Пробег, км": "Yurgan masofa, km",
  "Характеристики": "Xususiyatlar",
  "Самые востребованные параметры для продажи: двигатель, мощность, 0–100, максимальная скорость и расход.": "Sotuvda eng ko‘p so‘raladigan ma’lumotlar: dvigatel, quvvat, 0–100, maksimal tezlik va sarf.",
  "Двигатель": "Dvigatel",
  "Объём, л": "Hajmi, l",
  "Топливо": "Yoqilg‘i",
  "Не указано": "Ko‘rsatilmagan",
  "Бензин": "Benzin",
  "Дизель": "Dizel",
  "Гибрид": "Gibrid",
  "Plug-in гибрид": "Plug-in gibrid",
  "Электро": "Elektr",
  "Привод": "Uzatma turi",
  "Коробка": "Uzatmalar qutisi",
  "Автомат": "Avtomat",
  "Робот": "Robot",
  "Вариатор": "Variator",
  "Механика": "Mexanika",
  "Мест": "O‘rindiqlar",
  "Мощность, л.с.": "Quvvat, ot kuchi",
  "Крутящий момент, Н·м": "Aylanish momenti, N·m",
  "0–100 км/ч, сек": "0–100 km/soat, sek",
  "Макс. скорость, км/ч": "Maks. tezlik, km/soat",
  "Расход, л/100 км": "Sarf, l/100 km",
  "Запас хода EV, км": "EV yurish masofasi, km",
  "Цвета и фотографии": "Ranglar va suratlar",
  "Один автомобиль может иметь несколько цветовых вариантов. Фото кузова и салона хранятся раздельно.": "Bitta avtomobil bir nechta rang variantiga ega bo‘lishi mumkin. Kuzov va salon suratlari alohida saqlanadi.",
  "Цвет кузова": "Kuzov rangi",
  "Название цвета кузова": "Kuzov rangining nomi",
  "Цвет салона": "Salon rangi",
  "Название цвета салона": "Salon rangining nomi",
  "VIN": "VIN",
  "Внутренний номер": "Ichki raqam",
  "Количество": "Miqdor",
  "Кузов · фотографии": "Kuzov · suratlar",
  "Салон · фотографии": "Salon · suratlar",
  "Детали · фотографии": "Detallar · suratlar",
  "Фары, диски, решётка, материалы и уникальные элементы конкретного автомобиля.": "Faralar, disklar, panjara, materiallar va aynan shu avtomobilning noyob detallari.",
  "Добавить фото": "Surat qo‘shish",
  "Удалить вариант": "Variantni o‘chirish",
  "Добавить цвет": "Rang qo‘shish",
  "Цена, обзор и публикация": "Narx, sharh va e’lon",
  "Видео в базу не загружается: здесь хранится ссылка на основной Instagram-обзор.": "Video bazaga yuklanmaydi: bu yerda asosiy Instagram sharhiga havola saqlanadi.",
  "Цена": "Narx",
  "Валюта": "Valyuta",
  "Цена по запросу": "Narx so‘rov asosida",
  "Вместо числа в публичной карточке показывается запрос цены.": "Ommaviy kartada raqam o‘rniga narx so‘rovi ko‘rsatiladi.",
  "Instagram-обзор": "Instagram sharhi",
  "Рекомендуемый": "Tavsiya etilgan",
  "Поднимает автомобиль выше в каталоге.": "Avtomobilni katalogda yuqoriroqqa chiqaradi.",
  "Опубликовать на сайте": "Saytda e’lon qilish",
  "Доступно после добавления хотя бы одной фотографии кузова.": "Kuzovning kamida bitta surati qo‘shilgandan keyin mavjud.",
  "Описание": "Tavsif",
  "Русская и узбекская версии хранятся отдельно.": "Ruscha va o‘zbekcha versiyalar alohida saqlanadi.",
  "Коротко · RU": "Qisqa · RU",
  "Краткое описание для карточки": "Karta uchun qisqa tavsif",
  "Описание · RU": "Tavsif · RU",
  "Полное описание автомобиля": "Avtomobilning to‘liq tavsifi",
  "Марка не выбрана": "Brend tanlanmagan",
  "НОВЫЙ АВТОМОБИЛЬ": "YANGI AVTOMOBIL",
  "Сохраняем данные…": "Ma’lumotlar saqlanmoqda…",
  "Загружаем фото": "Suratlar yuklanmoqda",
  "Сохранить автомобиль": "Avtomobilni saqlash",
  "Автомобиль сохранён": "Avtomobil saqlandi",
  "D1 + R2 подтвердили запись": "D1 + R2 yozuvni tasdiqladi",
};

function createVariant(index = 0): VariantDraft {
  return {
    localId: crypto.randomUUID(),
    exteriorSwatch: index === 0 ? "#111214" : "#f4f4f0",
    exteriorColorName: "",
    interiorSwatch: "#111214",
    interiorColorName: "",
    vin: "",
    stockNumber: "",
    quantity: "1",
    exteriorPhotos: [],
    interiorPhotos: [],
    detailPhotos: [],
  };
}

const INITIAL_FORM: FormState = {
  brand: "",
  model: "",
  year: "2026",
  trim: "",
  status: "in_stock",
  countryCode: "KR",
  arrivalDate: "",
  isNew: true,
  mileageKm: "0",

  engineText: "",
  engineDisplacementL: "",
  fuelType: "",
  driveType: "",
  transmission: "automatic",
  seats: "",
  horsepowerHp: "",
  torqueNm: "",
  acceleration0100: "",
  topSpeedKmh: "",
  fuelConsumptionL100: "",
  electricRangeKm: "",

  price: "",
  currency: "USD",
  priceOnRequest: false,
  instagramUrl: "",

  shortDescriptionRu: "",
  shortDescriptionUz: "",
  descriptionRu: "",
  descriptionUz: "",

  isPublic: false,
  isFeatured: false,
};

function normalizeUpper(value: string, maxLength: number): string {
  return value.toUpperCase().replace(/\s{2,}/g, " ").slice(0, maxLength);
}

function looksLikeInstagramUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(candidate);
    return /(^|\.)instagram\.com$/i.test(url.hostname);
  } catch {
    return false;
  }
}

function isValidVin(value: string): boolean {
  return !value || /^[A-HJ-NPR-Z0-9]{11,17}$/.test(value);
}

export default function NewCarPage() {
  const [theme, setTheme] = useState<Theme>("light");
  const [language, setLanguage] = useState<Language>("ru");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [viewerRole, setViewerRole] = useState<"super_admin" | "admin" | "sales_manager" | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [variants, setVariants] = useState<VariantDraft[]>(() => [createVariant()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingText, setSavingText] = useState<string | null>(null);
  const [createdCar, setCreatedCar] = useState<{ id: number; title: string } | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [aiApplied, setAiApplied] = useState(false);
  const errorRef = useRef<HTMLDivElement | null>(null);

  const t = useCallback(
    (russian: string) => (language === "uz" ? (UZ_COPY[russian] ?? russian) : russian),
    [language],
  );

  const selectedBrand = useMemo(
    () => BRANDS.find((brand) => brand.value === form.brand) ?? null,
    [form.brand],
  );

  const totalExteriorPhotos = useMemo(
    () => variants.reduce((total, variant) => total + variant.exteriorPhotos.length, 0),
    [variants],
  );

  const totalPhotos = useMemo(
    () => variants.reduce(
      (total, variant) => total + variant.exteriorPhotos.length + variant.interiorPhotos.length + variant.detailPhotos.length,
      0,
    ),
    [variants],
  );

  const showArrivalDate = form.status === "in_transit" || form.status === "made_to_order" || form.status === "reserved";

  const applyTheme = useCallback((nextTheme: Theme) => {
    setTheme(nextTheme);
    try { localStorage.setItem("asu-theme", nextTheme); } catch {}
    const color = nextTheme === "light" ? "#f5f5f3" : "#0b0c0d";
    document.documentElement.dataset.asuTheme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    document.documentElement.style.backgroundColor = color;
    document.body.dataset.asuTheme = nextTheme;
    document.body.style.backgroundColor = color;
    let themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!themeMeta) {
      themeMeta = document.createElement("meta");
      themeMeta.name = "theme-color";
      document.head.appendChild(themeMeta);
    }
    themeMeta.content = color;
  }, []);

  useEffect(() => {
    try {
      const rootTheme = document.documentElement.dataset.asuTheme;
      if (rootTheme === "light" || rootTheme === "dark") return applyTheme(rootTheme);
      const stored = localStorage.getItem("asu-theme");
      if (stored === "light" || stored === "dark") return applyTheme(stored);
      applyTheme(matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    } catch {
      applyTheme("light");
    }
  }, [applyTheme]);

  const applyLanguage = useCallback((nextLanguage: Language) => {
    setLanguage(nextLanguage);
    document.documentElement.lang = nextLanguage;
    try { localStorage.setItem("asu-language", nextLanguage); } catch {}
  }, []);

  useEffect(() => {
    let nextLanguage: Language = navigator.language.toLowerCase().startsWith("uz") ? "uz" : "ru";
    try {
      const stored = localStorage.getItem("asu-language");
      if (stored === "ru" || stored === "uz") nextLanguage = stored;
    } catch {}
    applyLanguage(nextLanguage);
  }, [applyLanguage]);

  useEffect(() => {
    let cancelled = false;
    async function verifySession() {
      try {
        const response = await fetch("/api/me", {
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const data = (await response.json().catch(() => null)) as MeResponse | null;
        if (response.status === 401) {
          location.replace("/admin/login/");
          return;
        }
        if (!response.ok) throw new Error(data?.error || t("Не удалось проверить защищённую сессию."));
        if (!data?.user?.role || !["super_admin", "admin", "sales_manager"].includes(data.user.role)) {
          throw new Error(t("У вашей роли нет права добавлять автомобили."));
        }
        if (!cancelled) {
          setViewerRole(data.user.role);
          setAuthReady(true);
          setError(null);
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : t("Не удалось проверить защищённую сессию."));
      }
    }
    void verifySession();
    return () => { cancelled = true; };
  }, [t]);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [error]);

  useEffect(() => {
    if (!settingsOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettingsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [settingsOpen]);

  useEffect(() => {
    return () => {
      for (const variant of variants) {
        for (const photo of [...variant.exteriorPhotos, ...variant.interiorPhotos, ...variant.detailPhotos]) {
          URL.revokeObjectURL(photo.previewUrl);
        }
      }
    };
    // We only need final cleanup on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeTheme(nextTheme: Theme) {
    if (nextTheme === theme) return;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const transitionDocument = document as ViewTransitionDocument;
    if (!reducedMotion && transitionDocument.startViewTransition) {
      transitionDocument.startViewTransition(() => applyTheme(nextTheme));
      return;
    }
    applyTheme(nextTheme);
  }

  function setText(
    key: keyof FormState,
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setError(null);
  }

  function setUpperText(
    key: "model",
    event: ChangeEvent<HTMLInputElement>,
    maxLength: number,
  ) {
    setForm((current) => ({ ...current, [key]: normalizeUpper(event.target.value, maxLength) }));
    setError(null);
  }

  function selectBrand(brand: string) {
    setForm((current) => ({ ...current, brand }));
    setError(null);
  }

  function updateVariant(localId: string, patch: Partial<VariantDraft>) {
    setVariants((current) => current.map((variant) => variant.localId === localId ? { ...variant, ...patch } : variant));
    setError(null);
  }

  function removeVariant(localId: string) {
    setVariants((current) => {
      if (current.length <= 1) return current;
      const target = current.find((variant) => variant.localId === localId);
      if (target) {
        for (const photo of [...target.exteriorPhotos, ...target.interiorPhotos, ...target.detailPhotos]) {
          URL.revokeObjectURL(photo.previewUrl);
        }
      }
      return current.filter((variant) => variant.localId !== localId);
    });
  }

  function addVariant() {
    setVariants((current) => [...current, createVariant(current.length)]);
    setError(null);
  }

  function addPhotos(localId: string, group: PhotoGroup, files: FileList | null) {
    if (!files?.length) return;
    const accepted = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, 16)
      .map<PhotoDraft>((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      }));

    setVariants((current) => current.map((variant) => {
      if (variant.localId !== localId) return variant;
      const key: "exteriorPhotos" | "interiorPhotos" | "detailPhotos" = group === "exterior" ? "exteriorPhotos" : group === "interior" ? "interiorPhotos" : "detailPhotos";
      const next = [...variant[key], ...accepted].slice(0, 16);
      const keptIds = new Set(next.map((photo) => photo.id));
      for (const photo of accepted) {
        if (!keptIds.has(photo.id)) URL.revokeObjectURL(photo.previewUrl);
      }
      return { ...variant, [key]: next };
    }));
    setError(null);
  }

  function removePhoto(localId: string, group: PhotoGroup, photoId: string) {
    setVariants((current) => current.map((variant) => {
      if (variant.localId !== localId) return variant;
      const key: "exteriorPhotos" | "interiorPhotos" | "detailPhotos" = group === "exterior" ? "exteriorPhotos" : group === "interior" ? "interiorPhotos" : "detailPhotos";
      const target = variant[key].find((photo) => photo.id === photoId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return { ...variant, [key]: variant[key].filter((photo) => photo.id !== photoId) };
    }));
  }

  function valueString(value: string | number | null | undefined): string | null {
    if (value == null || value === "") return null;
    return String(value);
  }

  function applyAiResult(result: AiCarResult) {
    setForm((current) => {
      const next = { ...current };
      if (result.brand && BRANDS.some((brand) => brand.value === result.brand)) next.brand = result.brand;
      if (result.model) next.model = normalizeUpper(result.model, 100);
      if (result.year != null) next.year = String(result.year);
      if (result.trim) next.trim = result.trim;
      if (result.status && STATUS_OPTIONS.some((item) => item.value === result.status)) next.status = result.status;
      if (result.countryCode && COUNTRY_OPTIONS.some((item) => item.value === result.countryCode)) next.countryCode = result.countryCode;
      if (result.arrivalDate) next.arrivalDate = result.arrivalDate;
      if (typeof result.isNew === "boolean") {
        next.isNew = result.isNew;
        if (result.isNew && result.mileageKm == null) next.mileageKm = "0";
      }
      if (result.mileageKm != null) next.mileageKm = String(result.mileageKm);
      const assignText = (key: keyof FormState, value: string | number | null | undefined) => {
        const normalized = valueString(value);
        if (normalized != null) {
          const mutable = next as unknown as Record<string, unknown>;
          mutable[key as string] = normalized;
        }
      };
      assignText("engineText", result.engineText);
      assignText("engineDisplacementL", result.engineDisplacementL);
      assignText("fuelType", result.fuelType);
      assignText("driveType", result.driveType);
      assignText("transmission", result.transmission);
      assignText("seats", result.seats);
      assignText("horsepowerHp", result.horsepowerHp);
      assignText("torqueNm", result.torqueNm);
      assignText("acceleration0100", result.acceleration0100);
      assignText("topSpeedKmh", result.topSpeedKmh);
      assignText("fuelConsumptionL100", result.fuelConsumptionL100);
      assignText("electricRangeKm", result.electricRangeKm);
      assignText("price", result.price);
      if (result.currency && ["USD", "UZS", "EUR"].includes(result.currency)) next.currency = result.currency;
      if (typeof result.priceOnRequest === "boolean") next.priceOnRequest = result.priceOnRequest;
      assignText("instagramUrl", result.instagramUrl);
      assignText("shortDescriptionRu", result.shortDescriptionRu);
      assignText("shortDescriptionUz", result.shortDescriptionUz);
      assignText("descriptionRu", result.descriptionRu);
      assignText("descriptionUz", result.descriptionUz);
      if (!["in_transit", "made_to_order", "reserved"].includes(next.status)) next.arrivalDate = "";
      return next;
    });

    if (Array.isArray(result.variants) && result.variants.length > 0) {
      setVariants((current) => result.variants!.map((source, index) => {
        const existing = current[index];
        const base = existing ?? createVariant(index);
        return {
          ...base,
          exteriorSwatch: source.exteriorSwatch || base.exteriorSwatch,
          exteriorColorName: source.exteriorColorName || base.exteriorColorName,
          interiorSwatch: source.interiorSwatch || base.interiorSwatch,
          interiorColorName: source.interiorColorName || base.interiorColorName,
          vin: source.vin || base.vin,
          stockNumber: source.stockNumber || base.stockNumber,
          quantity: source.quantity != null ? String(source.quantity) : base.quantity,
        };
      }));
    }

    setAiWarnings(Array.isArray(result.warnings) ? result.warnings : []);
    setAiApplied(true);
    setError(null);
  }

  async function runAiAutofill() {
    const source = aiText.trim();
    if (source.length < 20) {
      setError(t("Вставьте текст с данными автомобиля."));
      return;
    }
    setAiLoading(true);
    setAiApplied(false);
    setAiWarnings([]);
    setError(null);
    try {
      const response = await fetch("/api/car-ai", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ text: source }),
      });
      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? ((await response.json().catch(() => null)) as AiAutofillResponse | null)
        : null;
      if (response.status === 401) {
        location.replace("/admin/login/");
        return;
      }
      if (!response.ok || !data?.success || !data.car) {
        const fallback = response.ok
          ? t("Не удалось выполнить автозаполнение.")
          : `Сервис автозаполнения недоступен (HTTP ${response.status}).`;
        throw new Error(data?.error || fallback);
      }
      applyAiResult(data.car);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("Не удалось выполнить автозаполнение."));
    } finally {
      setAiLoading(false);
    }
  }

  function validate(): string | null {
    if (!form.brand) return t("Выберите марку автомобиля.");
    if (!form.model.trim()) return t("Укажите модель автомобиля.");

    const year = Number(form.year);
    if (!Number.isInteger(year) || year < 1900 || year > 2100) return t("Проверьте год автомобиля.");

    if (showArrivalDate && form.arrivalDate && !/^\d{4}-\d{2}-\d{2}$/.test(form.arrivalDate)) {
      return t("Проверьте дату прибытия.");
    }

    if (!form.isNew) {
      const mileage = Number(form.mileageKm);
      if (!Number.isSafeInteger(mileage) || mileage < 0) return t("Проверьте пробег.");
    }

    if (form.seats) {
      const seats = Number(form.seats);
      if (!Number.isInteger(seats) || seats < 1 || seats > 99) return t("Проверьте количество мест.");
    }

    if (!form.priceOnRequest && form.price) {
      const price = Number(form.price);
      if (!Number.isSafeInteger(price) || price < 0) return t("Цена должна быть целым положительным числом.");
    }

    if (!looksLikeInstagramUrl(form.instagramUrl)) return t("Проверьте ссылку Instagram.");

    for (const variant of variants) {
      if (!isValidVin(variant.vin.trim().toUpperCase())) return t("Укажите VIN корректно или оставьте поле пустым.");
      const quantity = Number(variant.quantity || "1");
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return t("Проверьте количество мест.");
    }

    if (form.isPublic && totalExteriorPhotos === 0) {
      return t("Добавьте хотя бы одну фотографию кузова перед публикацией.");
    }

    return null;
  }

  async function uploadPhoto(params: {
    carId: number;
    variantId: number;
    group: PhotoGroup;
    photo: PhotoDraft;
    sortOrder: number;
    isCover: boolean;
  }) {
    const data = new FormData();
    data.set("carId", String(params.carId));
    data.set("variantId", String(params.variantId));
    data.set("group", params.group);
    data.set("sortOrder", String(params.sortOrder));
    data.set("isCover", params.isCover ? "1" : "0");
    const optimized = await compressImageForUpload(params.photo.file);
    data.set("file", optimized.file, optimized.file.name);

    const response = await fetch("/api/car-media", {
      method: "POST",
      credentials: "same-origin",
      body: data,
    });
    const result = (await response.json().catch(() => null)) as MediaResponse | null;
    if (response.status === 401) {
      location.replace("/admin/login/");
      throw new Error("Unauthorized");
    }
    if (!response.ok || !result?.success) throw new Error(result?.error || t("Не удалось загрузить фотографии."));
  }

  async function publishCar(carId: number) {
    const response = await fetch("/api/cars", {
      method: "PATCH",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ id: carId, isPublic: true }),
    });
    const data = (await response.json().catch(() => null)) as CreateCarResponse | null;
    if (!response.ok || !data?.success) throw new Error(data?.error || t("Не удалось добавить автомобиль."));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }

    setSaving(true);
    setSavingText(t("Сохраняем данные…"));
    setError(null);

    try {
      const payload = {
        brand: form.brand,
        model: form.model.trim().toUpperCase(),
        year: Number(form.year),
        trim: form.trim.trim() || null,
        status: form.status,
        countryCode: form.countryCode,
        arrivalDate: showArrivalDate ? (form.arrivalDate || null) : null,
        mileageKm: form.isNew ? 0 : Number(form.mileageKm || "0"),
        isNew: form.isNew,

        engineText: form.engineText.trim() || null,
        engineDisplacementL: form.engineDisplacementL || null,
        fuelType: form.fuelType || null,
        driveType: form.driveType || null,
        transmission: form.transmission || "automatic",
        seats: form.seats ? Number(form.seats) : null,
        horsepowerHp: form.horsepowerHp || null,
        torqueNm: form.torqueNm || null,
        acceleration0100: form.acceleration0100 || null,
        topSpeedKmh: form.topSpeedKmh || null,
        fuelConsumptionL100: form.fuelConsumptionL100 || null,
        electricRangeKm: form.electricRangeKm || null,

        price: form.priceOnRequest || !form.price ? null : Number(form.price),
        currency: form.currency,
        priceOnRequest: form.priceOnRequest || !form.price,
        instagramUrl: form.instagramUrl.trim() || null,

        shortDescriptionRu: form.shortDescriptionRu.trim() || null,
        shortDescriptionUz: form.shortDescriptionUz.trim() || null,
        descriptionRu: form.descriptionRu.trim() || null,
        descriptionUz: form.descriptionUz.trim() || null,

        isPublic: false,
        isFeatured: form.isFeatured,
        variants: variants.map((variant) => ({
          exteriorColorName: variant.exteriorColorName.trim() || null,
          exteriorSwatch: variant.exteriorSwatch,
          interiorColorName: variant.interiorColorName.trim() || null,
          interiorSwatch: variant.interiorSwatch,
          vin: variant.vin.trim().toUpperCase() || null,
          stockNumber: variant.stockNumber.trim().toUpperCase() || null,
          quantity: Number(variant.quantity || "1"),
        })),
      };

      const response = await fetch("/api/cars", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as CreateCarResponse | null;

      if (response.status === 401) {
        location.replace("/admin/login/");
        return;
      }
      if (!response.ok || !data?.success) throw new Error(data?.error || t("Не удалось добавить автомобиль."));

      const createdId = data.car?.id;
      if (!Number.isInteger(createdId) || !createdId) throw new Error(t("D1 не подтвердил ID созданного автомобиля."));

      const createdVariants = data.car?.variants ?? [];
      if (createdVariants.length !== variants.length) throw new Error("D1 не подтвердил все цветовые варианты.");

      let uploaded = 0;
      const total = totalPhotos;
      for (let index = 0; index < variants.length; index += 1) {
        const draft = variants[index];
        const dbVariant = createdVariants.find((variant) => variant.index === index);
        if (!dbVariant) throw new Error("D1 не подтвердил цветовой вариант.");

        for (let photoIndex = 0; photoIndex < draft.exteriorPhotos.length; photoIndex += 1) {
          setSavingText(`${t("Загружаем фото")} ${uploaded + 1}/${total}`);
          await uploadPhoto({
            carId: createdId,
            variantId: dbVariant.id,
            group: "exterior",
            photo: draft.exteriorPhotos[photoIndex],
            sortOrder: photoIndex,
            isCover: index === 0 && photoIndex === 0,
          });
          uploaded += 1;
        }

        for (let photoIndex = 0; photoIndex < draft.interiorPhotos.length; photoIndex += 1) {
          setSavingText(`${t("Загружаем фото")} ${uploaded + 1}/${total}`);
          await uploadPhoto({
            carId: createdId,
            variantId: dbVariant.id,
            group: "interior",
            photo: draft.interiorPhotos[photoIndex],
            sortOrder: photoIndex,
            isCover: false,
          });
          uploaded += 1;
        }

        for (let photoIndex = 0; photoIndex < draft.detailPhotos.length; photoIndex += 1) {
          setSavingText(`${t("Загружаем фото")} ${uploaded + 1}/${total}`);
          await uploadPhoto({
            carId: createdId,
            variantId: dbVariant.id,
            group: "detail",
            photo: draft.detailPhotos[photoIndex],
            sortOrder: photoIndex,
            isCover: false,
          });
          uploaded += 1;
        }
      }

      if (form.isPublic) await publishCar(createdId);

      const title = `${data.car?.brand || form.brand} ${data.car?.model || form.model}`.trim();
      setCreatedCar({ id: createdId, title });
      window.setTimeout(() => location.assign(`/admin/cars/?created=${createdId}`), 950);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("Не удалось добавить автомобиль."));
    } finally {
      setSaving(false);
      setSavingText(null);
    }
  }

  if (!authReady && !error) {
    return (
      <main className={styles.loadingPage} data-theme={theme}>
        <div className={styles.loadingDot} aria-label={t("Проверка сессии")} />
      </main>
    );
  }

  return (
    <main className={styles.page} data-theme={theme}>
      <AdminChrome
        current="cars"
        language={language}
        theme={theme}
        role={viewerRole}
        backHref="/admin/cars/"
        onLanguageChange={applyLanguage}
        onThemeChange={changeTheme}
      />

      <div className={styles.shell}>
        <section className={styles.intro}>
          <p className={styles.eyebrow}>{t("CONTROL SYSTEM · АВТОМОБИЛИ")}</p>
          <h1>{t("Новый автомобиль")}</h1>
          <p className={styles.introText}>{t("Быстрая форма: основные данные один раз, цвета и фотографии — отдельными вариантами.")}</p>
        </section>

        <section className={styles.aiCard} data-open={aiOpen}>
          <button
            className={styles.aiCardHeader}
            type="button"
            onClick={() => setAiOpen((current) => !current)}
            aria-expanded={aiOpen}
          >
            <span className={styles.aiMark} aria-hidden="true">✦</span>
            <span className={styles.aiCardTitle}>
              <strong>{t("Умное автозаполнение")}</strong>
              <small>{t("Вставьте характеристики, дилерский лист, invoice или большой текст — система разложит найденные данные по полям формы.")}</small>
            </span>
            <span className={styles.aiChevron} aria-hidden="true">⌄</span>
          </button>

          {aiOpen ? (
            <div className={styles.aiBody}>
              <label className={styles.aiTextField}>
                <span>{t("Вставить текст автомобиля")}</span>
                <textarea
                  value={aiText}
                  onChange={(event) => { setAiText(event.target.value.slice(0, 180000)); setAiApplied(false); }}
                  placeholder="2026 Toyota Grand Highlander Hybrid MAX Platinum AWD…"
                  spellCheck={false}
                />
                <small>{t("Можно вставить 10–15 страниц текста. Система не сохраняет автомобиль сама — поля останутся редактируемыми.")} · {aiText.length.toLocaleString(language === "uz" ? "uz-UZ" : "ru-RU")} / 180 000</small>
              </label>

              <div className={styles.aiActions}>
                <button
                  className={styles.aiPrimary}
                  type="button"
                  onClick={runAiAutofill}
                  disabled={aiLoading || aiText.trim().length < 20}
                >
                  <span aria-hidden="true">✦</span>
                  {aiLoading ? t("Анализируем…") : t("Проанализировать и заполнить")}
                </button>
                {aiText ? (
                  <button
                    className={styles.aiSecondary}
                    type="button"
                    onClick={() => { setAiText(""); setAiWarnings([]); setAiApplied(false); }}
                    disabled={aiLoading}
                  >
                    {t("Очистить")}
                  </button>
                ) : null}
              </div>

              {aiApplied ? (
                <div className={styles.aiSuccess} role="status">
                  <strong>{t("Автозаполнение завершено")}</strong>
                  <span>{t("Проверьте значения перед сохранением.")}</span>
                </div>
              ) : null}

              {aiWarnings.length > 0 ? (
                <div className={styles.aiWarnings}>
                  <strong>{t("Предупреждения автозаполнения")}</strong>
                  <ul>{aiWarnings.map((warning, index) => <li key={`${index}-${warning}`}>{warning}</li>)}</ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        {error ? (
          <div ref={errorRef} className={styles.errorBanner} role="alert">
            <span className={styles.errorIcon}>!</span><span>{error}</span>
          </div>
        ) : null}

        <form className={styles.form} onSubmit={submit} noValidate>
          <section className={styles.section}>
            <SectionHeader number="01" title={t("Автомобиль")} detail={t("Сначала выберите марку, затем укажите модель.")} />

            <div className={styles.brandRail} role="listbox" aria-label={t("Марка автомобиля")}>
              {BRANDS.map((brand) => {
                const active = form.brand === brand.value;
                return (
                  <button
                    key={brand.value}
                    className={`${styles.brandTile} ${active ? styles.brandTileActive : ""}`}
                    type="button"
                    onClick={() => selectBrand(brand.value)}
                    role="option"
                    aria-selected={active}
                  >
                    <span className={styles.brandLogoWrap} aria-hidden="true">
                      <img className={styles.brandLogo} data-brand={brand.value} src={brand.logo} alt="" draggable={false} />
                    </span>
                    <span className={styles.brandName}>{brand.value}</span>
                    {active ? <span className={styles.brandCheck} aria-hidden="true"><CheckIcon /></span> : null}
                  </button>
                );
              })}
            </div>

            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                <span>{t("Марка")}</span>
                <input value={selectedBrand?.value ?? ""} readOnly placeholder={t("Выберите выше")} />
              </label>
              <label className={styles.field}>
                <span>{t("Модель *")}</span>
                <input value={form.model} onChange={(event) => setUpperText("model", event, 100)} placeholder="GV80" autoCapitalize="characters" />
              </label>
              <label className={styles.field}>
                <span>{t("Комплектация")}</span>
                <input value={form.trim} onChange={(event) => setText("trim", event)} placeholder="3.5T Prestige" />
              </label>
              <label className={styles.field}>
                <span>{t("Год")}</span>
                <input value={form.year} onChange={(event) => setText("year", event)} inputMode="numeric" placeholder="2026" />
              </label>
            </div>

            <div className={styles.controlGroup}>
              <span className={styles.controlLabel}>{t("Состояние")}</span>
              <div className={styles.segmentGridTwo}>
                <button className={`${styles.segment} ${form.isNew ? styles.segmentActive : ""}`} type="button" onClick={() => setForm((current) => ({ ...current, isNew: true, mileageKm: "0" }))}>{t("Новый")}</button>
                <button className={`${styles.segment} ${!form.isNew ? styles.segmentActive : ""}`} type="button" onClick={() => setForm((current) => ({ ...current, isNew: false }))}>{t("С пробегом")}</button>
              </div>
            </div>

            {!form.isNew ? (
              <label className={`${styles.field} ${styles.inlineTopField}`}>
                <span>{t("Пробег, км")}</span>
                <input value={form.mileageKm} onChange={(event) => setText("mileageKm", event)} inputMode="numeric" placeholder="45000" />
              </label>
            ) : null}
          </section>

          <section className={styles.section}>
            <SectionHeader number="02" title={t("Поставка")} detail={t("Статус управляет полями формы: дата прибытия показывается только когда она имеет смысл.")} />

            <div className={styles.controlGroup}>
              <span className={styles.controlLabel}>{t("Статус")}</span>
              <div className={styles.statusGrid}>
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={`${styles.segment} ${form.status === option.value ? styles.segmentActive : ""}`}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, status: option.value, arrivalDate: option.value === "in_stock" || option.value === "in_showroom" ? "" : current.arrivalDate }))}
                  >
                    {option.label[language]}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                <span>{t("Страна поставки")}</span>
                <select value={form.countryCode} onChange={(event) => setText("countryCode", event)}>
                  {COUNTRY_OPTIONS.map((country) => <option key={country.value} value={country.value}>{country.label[language]}</option>)}
                </select>
              </label>

              {showArrivalDate ? (
                <label className={styles.field}>
                  <span>{t("Ожидаемая дата прибытия")}</span>
                  <input className={styles.dateInput} type="date" value={form.arrivalDate} onChange={(event) => setText("arrivalDate", event)} />
                </label>
              ) : null}
            </div>
          </section>

          <section className={styles.section}>
            <SectionHeader number="03" title={t("Характеристики")} detail={t("Самые востребованные параметры для продажи: двигатель, мощность, 0–100, максимальная скорость и расход.")} />

            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                <span>{t("Двигатель")}</span>
                <input value={form.engineText} onChange={(event) => setText("engineText", event)} placeholder="3.5 T-GDi V6" />
              </label>
              <label className={styles.field}>
                <span>{t("Объём, л")}</span>
                <input value={form.engineDisplacementL} onChange={(event) => setText("engineDisplacementL", event)} inputMode="decimal" placeholder="3.5" />
              </label>
              <label className={styles.field}>
                <span>{t("Топливо")}</span>
                <select value={form.fuelType} onChange={(event) => setText("fuelType", event)}>
                  <option value="">{t("Не указано")}</option>
                  <option value="gasoline">{t("Бензин")}</option>
                  <option value="diesel">{t("Дизель")}</option>
                  <option value="hybrid">{t("Гибрид")}</option>
                  <option value="phev">{t("Plug-in гибрид")}</option>
                  <option value="electric">{t("Электро")}</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>{t("Привод")}</span>
                <select value={form.driveType} onChange={(event) => setText("driveType", event)}>
                  <option value="">{t("Не указано")}</option>
                  <option value="AWD">AWD</option><option value="4WD">4WD</option><option value="RWD">RWD</option><option value="FWD">FWD</option>
                </select>
              </label>
            </div>

            <div className={styles.controlGroup}>
              <span className={styles.controlLabel}>{t("Коробка")}</span>
              <div className={styles.segmentGrid}>
                {[{ v: "automatic", l: "Автомат" }, { v: "robot", l: "Робот" }, { v: "cvt", l: "Вариатор" }, { v: "manual", l: "Механика" }].map((item) => (
                  <button key={item.v} className={`${styles.segment} ${form.transmission === item.v ? styles.segmentActive : ""}`} type="button" onClick={() => setForm((current) => ({ ...current, transmission: item.v }))}>{t(item.l)}</button>
                ))}
              </div>
            </div>

            <div className={`${styles.fieldGrid} ${styles.performanceGrid}`}>
              <label className={styles.field}><span>{t("Мест")}</span><input value={form.seats} onChange={(event) => setText("seats", event)} inputMode="numeric" placeholder="5" /></label>
              <label className={styles.field}><span>{t("Мощность, л.с.")}</span><input value={form.horsepowerHp} onChange={(event) => setText("horsepowerHp", event)} inputMode="numeric" placeholder="375" /></label>
              <label className={styles.field}><span>{t("Крутящий момент, Н·м")}</span><input value={form.torqueNm} onChange={(event) => setText("torqueNm", event)} inputMode="numeric" placeholder="530" /></label>
              <label className={styles.field}><span>{t("0–100 км/ч, сек")}</span><input value={form.acceleration0100} onChange={(event) => setText("acceleration0100", event)} inputMode="decimal" placeholder="5.5" /></label>
              <label className={styles.field}><span>{t("Макс. скорость, км/ч")}</span><input value={form.topSpeedKmh} onChange={(event) => setText("topSpeedKmh", event)} inputMode="numeric" placeholder="240" /></label>
              <label className={styles.field}><span>{t("Расход, л/100 км")}</span><input value={form.fuelConsumptionL100} onChange={(event) => setText("fuelConsumptionL100", event)} inputMode="decimal" placeholder="11.2" /></label>
              <label className={styles.field}><span>{t("Запас хода EV, км")}</span><input value={form.electricRangeKm} onChange={(event) => setText("electricRangeKm", event)} inputMode="numeric" placeholder="" /></label>
            </div>
          </section>

          <section className={styles.section}>
            <SectionHeader number="04" title={t("Цвета и фотографии")} detail={t("Один автомобиль может иметь несколько цветовых вариантов. Фото кузова и салона хранятся раздельно.")} />

            <div className={styles.variantStack}>
              {variants.map((variant, index) => (
                <article key={variant.localId} className={styles.variantCard}>
                  <div className={styles.variantHeader}>
                    <div><span>{String(index + 1).padStart(2, "0")}</span><strong>{variant.exteriorColorName || `${t("Цвет кузова")} ${index + 1}`}</strong></div>
                    {variants.length > 1 ? <button type="button" onClick={() => removeVariant(variant.localId)}>{t("Удалить вариант")}</button> : null}
                  </div>

                  <ColorPicker label={t("Цвет кузова")} nameLabel={t("Название цвета кузова")} palette={EXTERIOR_SWATCHES} value={variant.exteriorSwatch} name={variant.exteriorColorName} onColor={(value) => updateVariant(variant.localId, { exteriorSwatch: value })} onName={(value) => updateVariant(variant.localId, { exteriorColorName: value })} />
                  <ColorPicker label={t("Цвет салона")} nameLabel={t("Название цвета салона")} palette={INTERIOR_SWATCHES} value={variant.interiorSwatch} name={variant.interiorColorName} onColor={(value) => updateVariant(variant.localId, { interiorSwatch: value })} onName={(value) => updateVariant(variant.localId, { interiorColorName: value })} />

                  <div className={styles.fieldGrid}>
                    <label className={styles.field}><span>{t("VIN")}</span><input value={variant.vin} onChange={(event) => updateVariant(variant.localId, { vin: normalizeUpper(event.target.value, 17) })} autoCapitalize="characters" placeholder="SALKABB90TA346327" /></label>
                    <label className={styles.field}><span>{t("Внутренний номер")}</span><input value={variant.stockNumber} onChange={(event) => updateVariant(variant.localId, { stockNumber: normalizeUpper(event.target.value, 80) })} placeholder="ASU-0261" /></label>
                    <label className={styles.field}><span>{t("Количество")}</span><input value={variant.quantity} onChange={(event) => updateVariant(variant.localId, { quantity: event.target.value })} inputMode="numeric" placeholder="1" /></label>
                  </div>

                  <PhotoRail label={t("Кузов · фотографии")} buttonLabel={t("Добавить фото")} photos={variant.exteriorPhotos} onFiles={(files) => addPhotos(variant.localId, "exterior", files)} onRemove={(photoId) => removePhoto(variant.localId, "exterior", photoId)} />
                  <PhotoRail label={t("Салон · фотографии")} buttonLabel={t("Добавить фото")} photos={variant.interiorPhotos} onFiles={(files) => addPhotos(variant.localId, "interior", files)} onRemove={(photoId) => removePhoto(variant.localId, "interior", photoId)} />
                  <PhotoRail label={t("Детали · фотографии")} buttonLabel={t("Добавить фото")} photos={variant.detailPhotos} onFiles={(files) => addPhotos(variant.localId, "detail", files)} onRemove={(photoId) => removePhoto(variant.localId, "detail", photoId)} />
                  <p className={styles.photoHint}>{t("Фары, диски, решётка, материалы и уникальные элементы конкретного автомобиля.")}</p>
                </article>
              ))}
            </div>

            <button className={styles.addVariantButton} type="button" onClick={addVariant}><PlusIcon />{t("Добавить цвет")}</button>
          </section>

          <section className={styles.section}>
            <SectionHeader number="05" title={t("Цена, обзор и публикация")} detail={t("Видео в базу не загружается: здесь хранится ссылка на основной Instagram-обзор.")} />

            <div className={styles.priceRow}>
              <label className={`${styles.field} ${styles.priceField}`}>
                <span>{t("Цена")}</span>
                <input value={form.price} onChange={(event) => setText("price", event)} inputMode="numeric" placeholder="258000" disabled={form.priceOnRequest} />
              </label>
              <label className={`${styles.field} ${styles.currencyField}`}>
                <span>{t("Валюта")}</span>
                <select value={form.currency} onChange={(event) => setText("currency", event)}><option value="USD">USD</option><option value="UZS">UZS</option><option value="EUR">EUR</option></select>
              </label>
            </div>

            <label className={`${styles.field} ${styles.instagramField}`}>
              <span>{t("Instagram-обзор")}</span>
              <input value={form.instagramUrl} onChange={(event) => setText("instagramUrl", event)} inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder="https://www.instagram.com/reel/..." />
            </label>

            <div className={styles.switchList}>
              <SwitchRow label={t("Цена по запросу")} detail={t("Вместо числа в публичной карточке показывается запрос цены.")} checked={form.priceOnRequest} onChange={(checked) => setForm((current) => ({ ...current, priceOnRequest: checked }))} />
              <SwitchRow label={t("Рекомендуемый")} detail={t("Поднимает автомобиль выше в каталоге.")} checked={form.isFeatured} onChange={(checked) => setForm((current) => ({ ...current, isFeatured: checked }))} />
              <SwitchRow label={t("Опубликовать на сайте")} detail={t("Доступно после добавления хотя бы одной фотографии кузова.")} checked={form.isPublic} disabled={totalExteriorPhotos === 0} onChange={(checked) => setForm((current) => ({ ...current, isPublic: checked }))} />
            </div>
          </section>

          <section className={styles.section}>
            <SectionHeader number="06" title={t("Описание")} detail={t("Русская и узбекская версии хранятся отдельно.")} />
            <div className={styles.fieldGrid}>
              <label className={styles.field}><span>{t("Коротко · RU")}</span><textarea className={styles.shortTextarea} value={form.shortDescriptionRu} onChange={(event) => setText("shortDescriptionRu", event)} placeholder={t("Краткое описание для карточки")} maxLength={220} /></label>
              <label className={styles.field}><span>Qisqa · UZ</span><textarea className={styles.shortTextarea} value={form.shortDescriptionUz} onChange={(event) => setText("shortDescriptionUz", event)} placeholder="Kartochka uchun qisqa tavsif" maxLength={220} /></label>
              <label className={`${styles.field} ${styles.fieldWide}`}><span>{t("Описание · RU")}</span><textarea value={form.descriptionRu} onChange={(event) => setText("descriptionRu", event)} placeholder={t("Полное описание автомобиля")} /></label>
              <label className={`${styles.field} ${styles.fieldWide}`}><span>Tavsif · UZ</span><textarea value={form.descriptionUz} onChange={(event) => setText("descriptionUz", event)} placeholder="Avtomobilning to‘liq tavsifi" /></label>
            </div>
          </section>

          <div className={styles.saveDock}>
            <div className={styles.saveMeta}>
              <span>{form.brand || t("Марка не выбрана")}</span>
              <strong>{form.model || t("НОВЫЙ АВТОМОБИЛЬ")}</strong>
            </div>
            <button className={styles.saveButton} type="submit" disabled={saving || !authReady}>
              {saving ? <span className={styles.spinner} aria-hidden="true" /> : <CheckIcon />}
              <span>{saving ? (savingText || t("Сохраняем данные…")) : t("Сохранить автомобиль")}</span>
            </button>
          </div>
        </form>
      </div>

      {createdCar ? (
        <div className={styles.successOverlay} role="status" aria-live="polite">
          <div className={styles.successCard}>
            <span className={styles.successIcon}><CheckIcon /></span>
            <p>{t("Автомобиль сохранён")}</p>
            <h2>{createdCar.title}</h2>
            <span>{t("D1 + R2 подтвердили запись")} · ID {createdCar.id}</span>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function SectionHeader({ number, title, detail }: { number: string; title: string; detail: string }) {
  return (
    <div className={styles.sectionHeader}>
      <div><p className={styles.sectionKicker}>{number}</p><h2>{title}</h2></div>
      <p>{detail}</p>
    </div>
  );
}

function ColorPicker({
  label,
  nameLabel,
  palette,
  value,
  name,
  onColor,
  onName,
}: {
  label: string;
  nameLabel: string;
  palette: readonly { value: string; label: string }[];
  value: string;
  name: string;
  onColor: (value: string) => void;
  onName: (value: string) => void;
}) {
  return (
    <div className={styles.colorBlock}>
      <span className={styles.controlLabel}>{label}</span>
      <div className={styles.swatchRail} role="radiogroup" aria-label={label}>
        {palette.map((swatch) => (
          <button
            key={swatch.value}
            className={styles.swatchButton}
            data-selected={value === swatch.value}
            type="button"
            title={swatch.label}
            aria-label={swatch.label}
            aria-pressed={value === swatch.value}
            onClick={() => onColor(swatch.value)}
          >
            <span style={{ backgroundColor: swatch.value }} />
          </button>
        ))}
      </div>
      <label className={styles.field}>
        <span>{nameLabel}</span>
        <input value={name} onChange={(event) => onName(event.target.value)} placeholder="Vik Black / Uyuni White" />
      </label>
    </div>
  );
}

function PhotoRail({
  label,
  buttonLabel,
  photos,
  onFiles,
  onRemove,
}: {
  label: string;
  buttonLabel: string;
  photos: PhotoDraft[];
  onFiles: (files: FileList | null) => void;
  onRemove: (photoId: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className={styles.photoBlock}>
      <div className={styles.photoBlockHeader}>
        <span>{label}</span>
        <button type="button" onClick={() => inputRef.current?.click()}><PlusIcon />{buttonLabel}</button>
        <input ref={inputRef} className={styles.hiddenFileInput} type="file" accept="image/*" multiple onChange={(event) => { onFiles(event.target.files); event.currentTarget.value = ""; }} />
      </div>
      <div className={styles.photoRail} data-empty={photos.length === 0}>
        {photos.length === 0 ? <span className={styles.photoEmpty}>+</span> : photos.map((photo, index) => (
          <figure key={photo.id} className={styles.photoPreview}>
            <img src={photo.previewUrl} alt="" />
            {index === 0 ? <span className={styles.photoIndex}>{String(index + 1).padStart(2, "0")}</span> : null}
            <button type="button" aria-label="Удалить фото" onClick={() => onRemove(photo.id)}><TrashIcon /></button>
          </figure>
        ))}
      </div>
    </div>
  );
}

function SwitchRow({
  label,
  detail,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  detail: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={styles.switchRow} data-disabled={disabled}>
      <span className={styles.switchCopy}><strong>{label}</strong><small>{detail}</small></span>
      <input className={styles.switchInput} type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span className={styles.switchTrack} aria-hidden="true"><span className={styles.switchThumb} /></span>
    </label>
  );
}

function ChevronLeftIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.75 5.5 8.25 12l6.5 6.5" /></svg>;
}

function MenuIcon({ open }: { open: boolean }) {
  return <span className={styles.menuGlyph} data-open={open} aria-hidden="true"><i /><i /><i /></span>;
}

function MoonIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.2A8.1 8.1 0 0 1 8.8 4 8.25 8.25 0 1 0 20 15.2Z" /></svg>;
}

function SunIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.5" /><path d="M12 2.4v2.1M12 19.5v2.1M2.4 12h2.1M19.5 12h2.1M5.2 5.2l1.5 1.5M17.3 17.3l1.5 1.5M18.8 5.2l-1.5 1.5M6.7 17.3l-1.5 1.5" /></svg>;
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5.5 12.4 4.2 4.2 8.8-9.1" /></svg>;
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
}

function TrashIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg>;
}
