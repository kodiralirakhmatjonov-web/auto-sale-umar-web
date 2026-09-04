"use client";

import {
  ArrowUpRight,
  Check,
  ChevronRight,
  ExternalLink,
  Link2,
  Search,
  ShieldCheck,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import PublicChrome, { type PublicLanguage } from "../_components/PublicChrome";
import { copyForLanguage, isPublicLanguage, uiText } from "../_lib/public-language";
import styles from "./request-car.module.css";

type Language = PublicLanguage;
type ThemeMode = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";
type ContactChannel = "whatsapp" | "telegram" | "phone";
type PurchaseTiming = "7_days" | "30_days" | "90_days" | "flexible";
type Currency = "USD" | "UZS" | "EUR";

interface RequestResponse {
  success?: boolean;
  error?: string;
  request?: {
    code: string;
    brand: string;
    model: string;
    status: string;
  };
}

const BRANDS = [
  "Toyota",
  "Genesis",
  "BMW",
  "Mercedes-Benz",
  "Range Rover",
  "Rolls-Royce",
  "Cadillac",
  "Porsche",
  "Lexus",
  "Lamborghini",
];

const COPY = {
  ru: {
    eyebrow: "AUTO SALE UMAR · ПЕРСОНАЛЬНЫЙ ПОДБОР",
    title: "Найдём автомобиль под ваш запрос.",
    lead: "Если нужной машины сейчас нет в каталоге, отправьте точные параметры. Команда увидит запрос в Control System и начнёт подбор.",
    vehicle: "Какой автомобиль вы ищете?",
    vehicleText: "Марка и модель обязательны. Остальные параметры помогают подобрать автомобиль точнее.",
    brand: "Марка",
    model: "Модель",
    trim: "Комплектация",
    year: "Желаемый год",
    exterior: "Цвет кузова",
    interior: "Цвет салона",
    options: "Важные опции",
    budget: "Максимальный бюджет",
    currency: "Валюта",
    timing: "Когда планируете покупку?",
    transit: "Готов рассмотреть автомобиль в пути",
    reference: "Есть пример автомобиля?",
    referenceText: "Вставьте ссылку на Instagram, Telegram, YouTube, объявление или страницу автомобиля. Менеджер откроет её одним нажатием.",
    sourceUrl: "Ссылка на пример",
    sourcePlaceholder: "https://...",
    comment: "Комментарий",
    commentPlaceholder: "Например: только светлый салон, нужен 7-местный автомобиль, важна пневмоподвеска.",
    contact: "Как с вами связаться?",
    name: "Ваше имя",
    phone: "Телефон",
    channel: "Предпочтительный канал",
    whatsapp: "WhatsApp",
    telegram: "Telegram",
    phoneCall: "Звонок",
    submit: "Отправить запрос",
    sending: "Отправляем запрос…",
    privacy: "Запрос увидят только сотрудники Auto Sale Umar в Control System.",
    seven: "В ближайшие 7 дней",
    thirty: "В ближайшие 30 дней",
    ninety: "В ближайшие 3 месяца",
    flexible: "Срок не критичен",
    success: "Запрос принят.",
    successText: "Он уже появился в Control System. Менеджер увидит параметры автомобиля и сможет открыть вашу ссылку-пример напрямую.",
    requestCode: "Код запроса",
    requestedCar: "Автомобиль",
    back: "Вернуться на главную",
    another: "Отправить ещё один запрос",
    optional: "необязательно",
  },
  uz: {
    eyebrow: "AUTO SALE UMAR · SHAXSIY TANLOV",
    title: "Siz izlayotgan avtomobilni topamiz.",
    lead: "Kerakli avtomobil hozir katalogda bo‘lmasa, aniq parametrlarni yuboring. Jamoa so‘rovni Control System’da ko‘radi va qidiruvni boshlaydi.",
    vehicle: "Qanday avtomobil izlayapsiz?",
    vehicleText: "Marka va model majburiy. Qolgan parametrlar tanlovni aniqroq qiladi.",
    brand: "Marka",
    model: "Model",
    trim: "Komplektatsiya",
    year: "Istalgan yil",
    exterior: "Kuzov rangi",
    interior: "Salon rangi",
    options: "Muhim opsiyalar",
    budget: "Maksimal budjet",
    currency: "Valyuta",
    timing: "Qachon sotib olishni rejalashtiryapsiz?",
    transit: "Yo‘ldagi avtomobilni ham ko‘rib chiqaman",
    reference: "Avtomobil namunasi bormi?",
    referenceText: "Instagram, Telegram, YouTube, e’lon yoki avtomobil sahifasiga havolani kiriting. Menejer uni bir bosishda ochadi.",
    sourceUrl: "Namuna havolasi",
    sourcePlaceholder: "https://...",
    comment: "Izoh",
    commentPlaceholder: "Masalan: faqat och salon, 7 o‘rinli, pnevmatik osma muhim.",
    contact: "Siz bilan qanday bog‘lanamiz?",
    name: "Ismingiz",
    phone: "Telefon",
    channel: "Aloqa kanali",
    whatsapp: "WhatsApp",
    telegram: "Telegram",
    phoneCall: "Qo‘ng‘iroq",
    submit: "So‘rov yuborish",
    sending: "So‘rov yuborilmoqda…",
    privacy: "So‘rovni faqat Auto Sale Umar xodimlari Control System’da ko‘radi.",
    seven: "Keyingi 7 kun ichida",
    thirty: "Keyingi 30 kun ichida",
    ninety: "Keyingi 3 oy ichida",
    flexible: "Muddat muhim emas",
    success: "So‘rov qabul qilindi.",
    successText: "U Control System’da paydo bo‘ldi. Menejer avtomobil parametrlarini ko‘radi va namuna havolasini to‘g‘ridan-to‘g‘ri ochadi.",
    requestCode: "So‘rov kodi",
    requestedCar: "Avtomobil",
    back: "Bosh sahifaga qaytish",
    another: "Yana so‘rov yuborish",
    optional: "ixtiyoriy",
  },
} as const;

const TIMING_OPTIONS: PurchaseTiming[] = ["7_days", "30_days", "90_days", "flexible"];

function timingLabel(value: PurchaseTiming, language: Language): string {
  const c = copyForLanguage(COPY, language);
  if (value === "7_days") return c.seven;
  if (value === "30_days") return c.thirty;
  if (value === "90_days") return c.ninety;
  return c.flexible;
}

export default function RequestCarPage() {
  const [language, setLanguage] = useState<Language>("ru");
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [trim, setTrim] = useState("");
  const [desiredYear, setDesiredYear] = useState("");
  const [exteriorColor, setExteriorColor] = useState("");
  const [interiorColor, setInteriorColor] = useState("");
  const [importantOptions, setImportantOptions] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [purchaseTiming, setPurchaseTiming] = useState<PurchaseTiming>("30_days");
  const [acceptInTransit, setAcceptInTransit] = useState(true);
  const [sourceUrl, setSourceUrl] = useState("");
  const [note, setNote] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [contactChannel, setContactChannel] = useState<ContactChannel>("whatsapp");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<RequestResponse["request"] | null>(null);
  const c = copyForLanguage(COPY, language);

  useEffect(() => {
    try {
      const storedLang = localStorage.getItem("asu-public-language") ?? localStorage.getItem("asu-language");
      if (isPublicLanguage(storedLang)) setLanguage(storedLang);
      const storedTheme = localStorage.getItem("asu-public-theme");
      if (storedTheme === "system" || storedTheme === "light" || storedTheme === "dark") setThemeMode(storedTheme);

      const query = new URLSearchParams(window.location.search);
      const queryBrand = query.get("brand")?.trim();
      if (queryBrand) setBrand(queryBrand.slice(0, 80));
    } catch {}
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const next: ResolvedTheme = themeMode === "system" ? (media.matches ? "dark" : "light") : themeMode;
      setResolvedTheme(next);
      document.documentElement.dataset.asuPublicTheme = next;
      document.documentElement.style.colorScheme = next;
      const color = next === "dark" ? "#090a0b" : "#f5f5f3";
      document.documentElement.style.backgroundColor = color;
      document.body.style.backgroundColor = color;
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

  const sourcePreview = useMemo(() => {
    if (!sourceUrl.trim()) return null;
    try {
      const url = new URL(sourceUrl.trim());
      if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
    } catch {}
    return null;
  }, [sourceUrl]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/vehicle-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          customerName: name,
          phone,
          contactChannel,
          brand,
          model,
          trim,
          desiredYear: desiredYear ? Number(desiredYear) : null,
          exteriorColor,
          interiorColor,
          importantOptions,
          maxBudget: maxBudget ? Number(maxBudget.replace(/\s/g, "")) : null,
          currency,
          purchaseTiming,
          acceptInTransit,
          sourceUrl,
          note,
        }),
      });
      const data = await response.json().catch(() => null) as RequestResponse | null;
      if (!response.ok || !data?.success || !data.request) throw new Error(uiText(language, "Не удалось отправить запрос.", "So‘rovni yuborib bo‘lmadi."));
      setSuccess(data.request);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError(uiText(language, "Не удалось отправить запрос.", "So‘rovni yuborib bo‘lmadi."));
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setSuccess(null);
    setModel("");
    setTrim("");
    setDesiredYear("");
    setExteriorColor("");
    setInteriorColor("");
    setImportantOptions("");
    setMaxBudget("");
    setSourceUrl("");
    setNote("");
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
            <div><small>{c.requestCode}</small><strong>{success.code}</strong></div>
            <div><small>{c.requestedCar}</small><strong>{success.brand} {success.model}</strong></div>
          </div>
          <a className={styles.primaryButton} href="/">{c.back}<ArrowUpRight /></a>
          <button className={styles.secondaryButton} type="button" onClick={reset}>{c.another}</button>
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

      <section className={styles.hero}>
        <div className={styles.heroIcon}><Search /></div>
        <p>{c.eyebrow}</p>
        <h1>{c.title}</h1>
        <span>{c.lead}</span>
      </section>

      <form className={styles.form} onSubmit={submit}>
        <section className={styles.formSection}>
          <div className={styles.sectionTitle}>
            <div><span>01</span><h2>{c.vehicle}</h2></div>
            <p>{c.vehicleText}</p>
          </div>

          <div className={styles.brandRail} aria-label={c.brand}>
            {BRANDS.map((item) => (
              <button key={item} type="button" data-active={brand === item} onClick={() => setBrand(item)}>{item}</button>
            ))}
          </div>

          <div className={styles.fields}>
            <label>
              <span>{c.brand}</span>
              <input value={brand} onChange={(event) => setBrand(event.target.value)} required maxLength={80} placeholder="Genesis" />
            </label>
            <label>
              <span>{c.model}</span>
              <input value={model} onChange={(event) => setModel(event.target.value)} required maxLength={100} placeholder="GV80" />
            </label>
            <label>
              <span>{c.trim} <small>{c.optional}</small></span>
              <input value={trim} onChange={(event) => setTrim(event.target.value)} maxLength={140} placeholder="3.5T Prestige" />
            </label>
            <label>
              <span>{c.year} <small>{c.optional}</small></span>
              <input value={desiredYear} onChange={(event) => setDesiredYear(event.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="2026" />
            </label>
            <label>
              <span>{c.exterior} <small>{c.optional}</small></span>
              <input value={exteriorColor} onChange={(event) => setExteriorColor(event.target.value)} maxLength={100} placeholder={uiText(language, "Белый", "Oq")} />
            </label>
            <label>
              <span>{c.interior} <small>{c.optional}</small></span>
              <input value={interiorColor} onChange={(event) => setInteriorColor(event.target.value)} maxLength={100} placeholder={uiText(language, "Светлый", "Och")} />
            </label>
            <label className={styles.fullField}>
              <span>{c.options} <small>{c.optional}</small></span>
              <textarea value={importantOptions} onChange={(event) => setImportantOptions(event.target.value)} maxLength={700} placeholder={uiText(language, "Пневмоподвеска, 7 мест, вентиляция сидений…", "Pnevmatik osma, 7 o‘rin, o‘rindiq ventilyatsiyasi…")} />
            </label>
          </div>
        </section>

        <section className={styles.formSection}>
          <div className={styles.sectionTitle}>
            <div><span>02</span><h2>{uiText(language, "Бюджет и срок", "Budjet va muddat")}</h2></div>
            <p>{uiText(language, "Эти данные помогают отличить реальный спрос от обычного интереса.", "Bu ma’lumotlar real talabni oddiy qiziqishdan ajratishga yordam beradi.")}</p>
          </div>

          <div className={styles.budgetRow}>
            <label className={styles.budgetField}>
              <span>{c.budget} <small>{c.optional}</small></span>
              <input value={maxBudget} onChange={(event) => setMaxBudget(event.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" placeholder="100000" />
            </label>
            <div className={styles.currencyGroup} aria-label={c.currency}>
              {(["USD", "UZS", "EUR"] as const).map((item) => (
                <button type="button" key={item} data-active={currency === item} onClick={() => setCurrency(item)}>{item}</button>
              ))}
            </div>
          </div>

          <div className={styles.choiceGrid}>
            {TIMING_OPTIONS.map((item) => (
              <button type="button" key={item} data-active={purchaseTiming === item} onClick={() => setPurchaseTiming(item)}>
                <span>{timingLabel(item, language)}</span><ChevronRight />
              </button>
            ))}
          </div>

          <button className={styles.toggleRow} type="button" data-active={acceptInTransit} onClick={() => setAcceptInTransit((value) => !value)}>
            <span><Check /></span><b>{c.transit}</b>
          </button>
        </section>

        <section className={styles.formSection}>
          <div className={styles.sectionTitle}>
            <div><span>03</span><h2>{c.reference}</h2></div>
            <p>{c.referenceText}</p>
          </div>

          <label className={styles.linkField}>
            <span><Link2 />{c.sourceUrl} <small>{c.optional}</small></span>
            <div>
              <input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} maxLength={800} placeholder={c.sourcePlaceholder} />
              {sourcePreview ? <a href={sourcePreview} target="_blank" rel="noreferrer" aria-label={c.sourceUrl}><ExternalLink /></a> : null}
            </div>
          </label>

          <label className={styles.commentField}>
            <span>{c.comment} <small>{c.optional}</small></span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1200} placeholder={c.commentPlaceholder} />
          </label>
        </section>

        <section className={styles.formSection}>
          <div className={styles.sectionTitle}>
            <div><span>04</span><h2>{c.contact}</h2></div>
          </div>

          <div className={styles.fields}>
            <label>
              <span>{c.name}</span>
              <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} autoComplete="name" />
            </label>
            <label>
              <span>{c.phone}</span>
              <input value={phone} onChange={(event) => setPhone(event.target.value)} required maxLength={32} inputMode="tel" autoComplete="tel" placeholder="+998" />
            </label>
          </div>

          <div className={styles.contactChoices} aria-label={c.channel}>
            {(["whatsapp", "telegram", "phone"] as const).map((item) => (
              <button type="button" key={item} data-active={contactChannel === item} onClick={() => setContactChannel(item)}>
                {item === "whatsapp" ? c.whatsapp : item === "telegram" ? c.telegram : c.phoneCall}
              </button>
            ))}
          </div>

          {error ? <div className={styles.error}>{error}</div> : null}

          <button className={styles.submitButton} type="submit" disabled={submitting}>
            <Search />{submitting ? c.sending : c.submit}
          </button>
          <div className={styles.privacy}><ShieldCheck /><span>{c.privacy}</span></div>
        </section>
      </form>
    </main>
  );
}
