"use client";

import {
  ArrowUpRight,
  CarFront,
  Check,
  MapPin,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import styles from "./booking.module.css";
import PublicChrome, { type PublicLanguage } from "../_components/PublicChrome";
import { copyForLanguage, isPublicLanguage, publicLocale, uiText } from "../_lib/public-language";

type Language = PublicLanguage;
type ThemeMode = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

interface CatalogCar {
  id: number;
  brand: string;
  model: string;
  trim: string | null;
  year: number | null;
  coverUrl: string | null;
  status: string;
}

interface CatalogResponse { success?: boolean; cars?: CatalogCar[] }
interface VisitResponse {
  success?: boolean;
  error?: string;
  visit?: {
    code: string;
    visitDate: string;
    timeSlot: string;
    brand: string | null;
    carLabel: string | null;
  };
}

const SHOWROOM_IMAGES = [
  "/showroom/showroom-01.webp",
  "/showroom/showroom-02.webp",
  "/showroom/showroom-03.webp",
  "/showroom/showroom-04.webp",
  "/showroom/showroom-05.webp",
];

const BRANDS = [
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
];

const TIME_SLOTS = ["10:00–12:00", "12:00–14:00", "14:00–16:00", "16:00–18:00", "18:00–20:00"];
const YANDEX_MAPS_URL = "https://yandex.ru/maps/org/auto_sale_umar/98317002086?si=y1pjpr56py0hyc8ar2j2cw1t40";

const COPY = {
  ru: {
    eyebrow: "AUTO SALE UMAR · ШОУРУМ",
    title: "Забронируйте время для спокойного выбора.",
    lead: "Выберите удобную дату, временной промежуток и автомобиль, который хотите посмотреть. Мы подготовим визит заранее.",
    date: "Дата визита",
    time: "Время",
    brand: "Интересующая марка",
    anyBrand: "Любая марка",
    car: "Конкретный автомобиль",
    optional: "необязательно",
    anyCar: "Без привязки к автомобилю",
    details: "Контактные данные",
    name: "Ваше имя",
    phone: "Телефон",
    note: "Комментарий",
    notePlaceholder: "Например: хочу сравнить два цвета или посмотреть автомобиль вместе с семьёй.",
    submit: "Забронировать визит",
    sending: "Сохраняем бронирование…",
    map: "Построить маршрут",
    address: "Auto Sale Umar · Ташкент",
    success: "Визит забронирован",
    successText: "Бронирование уже появилось в Control System. Сотрудник шоурума увидит его и сможет подтвердить визит.",
    code: "Код визита",
    back: "Вернуться на главную",
    today: "Сегодня",
    tomorrow: "Завтра",
  },
  uz: {
    eyebrow: "AUTO SALE UMAR · SHOURUM",
    title: "Xotirjam tanlov uchun vaqtni band qiling.",
    lead: "Qulay sana, vaqt oralig‘i va ko‘rmoqchi bo‘lgan avtomobilingizni tanlang. Tashrifni oldindan tayyorlaymiz.",
    date: "Tashrif sanasi",
    time: "Vaqt",
    brand: "Qiziqtirgan marka",
    anyBrand: "Istalgan marka",
    car: "Aniq avtomobil",
    optional: "ixtiyoriy",
    anyCar: "Aniq avtomobilsiz",
    details: "Aloqa ma’lumotlari",
    name: "Ismingiz",
    phone: "Telefon",
    note: "Izoh",
    notePlaceholder: "Masalan: ikki rangni solishtirmoqchiman yoki oilam bilan kelaman.",
    submit: "Tashrifni band qilish",
    sending: "Band qilinmoqda…",
    map: "Yo‘nalishni ochish",
    address: "Auto Sale Umar · Toshkent",
    success: "Tashrif band qilindi",
    successText: "Band qilish Control System’da paydo bo‘ldi. Shourum xodimi uni ko‘radi va tashrifni tasdiqlashi mumkin.",
    code: "Tashrif kodi",
    back: "Bosh sahifaga qaytish",
    today: "Bugun",
    tomorrow: "Ertaga",
  },
} as const;

function localIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function nextDates(count: number) {
  const result: Date[] = [];
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  for (let index = 0; index < count; index += 1) {
    const value = new Date(today);
    value.setDate(today.getDate() + index + 1);
    result.push(value);
  }
  return result;
}

export default function BookingPage() {
  const [language, setLanguage] = useState<Language>("ru");
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [cars, setCars] = useState<CatalogCar[]>([]);
  const [date, setDate] = useState(() => { const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); return localIso(tomorrow); });
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]);
  const [brand, setBrand] = useState("");
  const [carId, setCarId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<VisitResponse["visit"] | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const photoRailRef = useRef<HTMLDivElement | null>(null);
  const c = copyForLanguage(COPY, language);

  useEffect(() => {
    try {
      const storedLang = localStorage.getItem("asu-public-language") ?? localStorage.getItem("asu-language");
      if (isPublicLanguage(storedLang)) setLanguage(storedLang);
      const storedTheme = localStorage.getItem("asu-public-theme");
      if (storedTheme === "system" || storedTheme === "light" || storedTheme === "dark") setThemeMode(storedTheme);
    } catch {}

    fetch("/api/catalog?pageSize=100", { cache: "no-store" })
      .then((response) => response.json() as Promise<CatalogResponse>)
      .then((data) => setCars(Array.isArray(data.cars) ? data.cars : []))
      .catch(() => setCars([]));
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const next: ResolvedTheme = themeMode === "system" ? (media.matches ? "dark" : "light") : themeMode;
      setResolvedTheme(next);
      document.documentElement.dataset.asuPublicTheme = next;
      document.documentElement.style.colorScheme = next;
    };
    apply();
    if (themeMode === "system") media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [themeMode]);

  function changeLanguage(next: Language) {
    setLanguage(next);
    try { localStorage.setItem("asu-public-language", next); } catch {}
  }

  function changeTheme(next: ThemeMode) {
    setThemeMode(next);
    try { localStorage.setItem("asu-public-theme", next); } catch {}
  }

  const dates = useMemo(() => nextDates(21), []);
  const filteredCars = useMemo(
    () => cars.filter((car) => !brand || car.brand === brand),
    [cars, brand],
  );
  const selectedCar = cars.find((car) => car.id === carId) ?? null;

  function selectBrand(next: string) {
    setBrand(next);
    if (carId && !cars.some((car) => car.id === carId && (!next || car.brand === next))) setCarId(null);
  }

  function handlePhotoScroll() {
    const rail = photoRailRef.current;
    if (!rail || rail.clientWidth <= 0) return;
    setPhotoIndex(Math.round(rail.scrollLeft / rail.clientWidth));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          customerName: name,
          phone,
          visitDate: date,
          timeSlot,
          brand,
          carId,
          carLabel: selectedCar ? `${selectedCar.brand} ${selectedCar.model}${selectedCar.trim ? ` · ${selectedCar.trim}` : ""}` : "",
          note,
        }),
      });
      const data = await response.json().catch(() => null) as VisitResponse | null;
      if (!response.ok || !data?.success || !data.visit) throw new Error(uiText(language, "Не удалось забронировать визит.", "Tashrifni band qilib bo‘lmadi."));
      setSuccess(data.visit);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError(uiText(language, "Не удалось забронировать визит.", "Tashrifni band qilib bo‘lmadi."));
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
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
        <section className={styles.successPage}>
          <div className={styles.successMark}><Check /></div>
          <p>{c.eyebrow}</p>
          <h1>{c.success}</h1>
          <span>{c.successText}</span>
          <div className={styles.successGrid}>
            <div><small>{c.code}</small><strong>{success.code}</strong></div>
            <div><small>{c.date}</small><strong>{success.visitDate}</strong></div>
            <div><small>{c.time}</small><strong>{success.timeSlot}</strong></div>
          </div>
          <a className={styles.primaryButton} href="/">{c.back}<ArrowUpRight /></a>
          <a className={styles.secondaryButton} href={YANDEX_MAPS_URL} target="_blank" rel="noreferrer"><MapPin />{c.map}</a>
        </section>
      </main>
    );
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

      <section className={styles.showroomHero}>
        <div className={styles.photoRail} ref={photoRailRef} onScroll={handlePhotoScroll}>
          {SHOWROOM_IMAGES.map((src) => <div className={styles.photoSlide} key={src}><img src={src} alt="Auto Sale Umar showroom" /></div>)}
        </div>
        <div className={styles.photoDots}>{SHOWROOM_IMAGES.map((src, index) => <i key={src} data-active={index === photoIndex} />)}</div>
        <div className={styles.showroomOverlay}><span><MapPin />{c.address}</span><a href={YANDEX_MAPS_URL} target="_blank" rel="noreferrer">{c.map}<ArrowUpRight /></a></div>
      </section>

      <section className={styles.intro}>
        <p>{c.eyebrow}</p>
        <h1>{c.title}</h1>
        <span>{c.lead}</span>
      </section>

      <form className={styles.form} onSubmit={submit}>
        <section className={styles.formSection}>
          <div className={styles.sectionTitle}><div><small>01</small><h2>{c.date}</h2></div></div>
          <div className={styles.dateRail}>
            {dates.map((item, index) => {
              const value = localIso(item);
              const dayLabel = index === 0 ? c.tomorrow : new Intl.DateTimeFormat(publicLocale(language), { weekday: "short" }).format(item);
              return <button type="button" key={value} data-active={date === value} onClick={() => setDate(value)}><small>{dayLabel}</small><strong>{item.getDate()}</strong><span>{new Intl.DateTimeFormat(publicLocale(language), { month: "short" }).format(item)}</span></button>;
            })}
          </div>
        </section>

        <section className={styles.formSection}>
          <div className={styles.sectionTitle}><div><small>02</small><h2>{c.time}</h2></div></div>
          <div className={styles.slotGrid}>{TIME_SLOTS.map((slot) => <button type="button" key={slot} data-active={timeSlot === slot} onClick={() => setTimeSlot(slot)}>{slot}</button>)}</div>
        </section>

        <section className={styles.formSection}>
          <div className={styles.sectionTitle}><div><small>03</small><h2>{c.brand}</h2></div></div>
          <div className={styles.brandRail}>
            <button className={`${styles.brandCard} ${styles.anyBrandCard}`} type="button" data-active={!brand} onClick={() => selectBrand("")}><span className={styles.anyBrandMark}>AUTO</span><b>{c.anyBrand}</b></button>
            {BRANDS.map((item) => <button className={styles.brandCard} type="button" key={item.name} data-active={brand === item.name} onClick={() => selectBrand(item.name)}><span><img src={item.logo} alt="" /></span><b>{item.name}</b></button>)}
          </div>
        </section>

        <section className={styles.formSection}>
          <div className={styles.sectionTitle}><div><small>04 · {c.optional}</small><h2>{c.car}</h2></div></div>
          <div className={styles.carChoiceGrid}>
            <button type="button" className={styles.carChoice} data-active={carId == null} onClick={() => setCarId(null)}><span className={styles.carChoiceIcon}><CarFront /></span><div><b>{c.anyCar}</b><small>{brand || c.anyBrand}</small></div></button>
            {filteredCars.slice(0, 12).map((car) => <button type="button" className={styles.carChoice} data-active={carId === car.id} key={car.id} onClick={() => { setCarId(car.id); setBrand(car.brand); }}>
              <span className={styles.carThumb}>{car.coverUrl ? <img src={car.coverUrl} alt="" /> : <CarFront />}</span>
              <div><b>{car.brand} {car.model}</b><small>{[car.year, car.trim].filter(Boolean).join(" · ")}</small></div>
            </button>)}
          </div>
        </section>

        <section className={styles.formSection}>
          <div className={styles.sectionTitle}><div><small>05</small><h2>{c.details}</h2></div></div>
          <div className={styles.fields}>
            <label><span>{c.name}</span><input required value={name} onChange={(event) => setName(event.target.value)} placeholder={uiText(language, "Имя и фамилия", "Ism va familiya")} /></label>
            <label><span>{c.phone}</span><input required type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+998 90 123 45 67" /></label>
            <label className={styles.fullField}><span>{c.note} · {c.optional}</span><textarea value={note} onChange={(event) => setNote(event.target.value.slice(0, 800))} placeholder={c.notePlaceholder} /></label>
          </div>
        </section>

        {error ? <div className={styles.error} role="alert">{error}</div> : null}
        <button className={styles.submitButton} type="submit" disabled={submitting}>{submitting ? c.sending : c.submit}<ArrowUpRight /></button>
        <a className={styles.mapButton} href={YANDEX_MAPS_URL} target="_blank" rel="noreferrer"><MapPin />{c.map}<span>{c.address}</span></a>
      </form>
    </main>
  );
}
