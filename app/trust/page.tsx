"use client";

import {
  ArrowRight,
  CalendarRange,
  CarFront,
  Check,
  Handshake,
  Route,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import PublicChrome, {
  type PublicLanguage,
  type PublicResolvedTheme,
  type PublicThemeMode,
} from "../_components/PublicChrome";
import { copyForLanguage, isPublicLanguage, uiText } from "../_lib/public-language";
import styles from "./trust.module.css";

const COPY = {
  ru: {
    kicker: "AUTO SALE UMAR · 25 ЛЕТ ОПЫТА",
    title: "Доверие не появляется за один день.",
    intro: "25 лет в автомобильной сфере формируют не только опыт. Они формируют стандарт: понимать автомобиль, уважать выбор клиента и отвечать за результат.",
    years: "25",
    yearsLabel: "лет опыта в автомобильной сфере",
    storyKicker: "НАША ИСТОРИЯ",
    storyTitle: "Меняются автомобили. Принцип остаётся.",
    p1: "За четверть века автомобильный рынок менялся много раз: новые бренды, технологии, рынки поставки и способы покупки. Но доверие всегда строилось одинаково — на точности, ответственности и отношении к человеку.",
    p2: "Сегодня этот опыт продолжает Auto Sale Umar. Мы соединяем живой шоурум, международный подбор и цифровой каталог в одну понятную систему, где клиент видит конкретный автомобиль и его реальный статус.",
    p3: "Для нас хорошая сделка — не момент передачи ключей. Это ощущение клиента, что его выбор был осознанным, спокойным и правильным.",
    principlesKicker: "ТО, ЧТО НЕ МЕНЯЕТСЯ",
    principlesTitle: "Три принципа, на которых держится доверие.",
    principle1: "Репутация важнее одной сделки",
    principle1d: "Мы думаем не о том, как продать сегодня, а о том, с каким впечатлением клиент вернётся завтра.",
    principle2: "Точность важнее обещаний",
    principle2d: "Статус, характеристики и путь автомобиля должны быть понятны до принятия решения.",
    principle3: "Сопровождение до результата",
    principle3d: "От первого вопроса до автомобиля у клиента — один понятный путь и ответственное сопровождение.",
    todayKicker: "25 ЛЕТ → СЕГОДНЯ",
    todayTitle: "Опыт прошлого. Сервис настоящего.",
    todayText: "Сегодня доверие поддерживается не только отношением, но и системой: каталогом реальных автомобилей, прозрачными статусами, международной поставкой и персональным контактом с командой Auto Sale Umar.",
    stat1: "Опыт",
    stat1d: "25 лет в автомобильной сфере",
    stat2: "Подход",
    stat2d: "Персональный выбор без давления",
    stat3: "Система",
    stat3d: "Шоурум + цифровой каталог",
    finalKicker: "AUTO SALE UMAR",
    finalTitle: "Доверие, которое продолжается.",
    finalText: "Выберите автомобиль онлайн или приезжайте в шоурум. Мы продолжим историю с вашего следующего автомобиля.",
    cars: "Смотреть автомобили",
    visit: "Забронировать визит",
  },
  uz: {
    kicker: "AUTO SALE UMAR · 25 YILLIK TAJRIBA",
    title: "Ishonch bir kunda paydo bo‘lmaydi.",
    intro: "Avtomobil sohasidagi 25 yil faqat tajriba emas. Bu standart: avtomobilni tushunish, mijoz tanlovini hurmat qilish va natija uchun javob berish.",
    years: "25",
    yearsLabel: "yil avtomobil sohasidagi tajriba",
    storyKicker: "BIZNING TARIX",
    storyTitle: "Avtomobillar o‘zgaradi. Tamoyil qoladi.",
    p1: "Chorak asr davomida avtomobil bozori ko‘p marta o‘zgardi: yangi brendlar, texnologiyalar, yetkazib berish bozorlari va xarid usullari. Ammo ishonch doim bir xil quriladi — aniqlik, mas’uliyat va insonga munosabat orqali.",
    p2: "Bugun bu tajribani Auto Sale Umar davom ettiradi. Biz jonli shourum, xalqaro tanlov va raqamli katalogni bitta tushunarli tizimga birlashtiramiz.",
    p3: "Biz uchun yaxshi bitim kalit topshirilgan paytda tugamaydi. Muhimi — mijoz o‘z tanlovini xotirjam va to‘g‘ri deb his qilishi.",
    principlesKicker: "O‘ZGARMAYDIGAN NARSALAR",
    principlesTitle: "Ishonch tayanadigan uch tamoyil.",
    principle1: "Obro‘ bir savdodan muhimroq",
    principle1d: "Bugun sotishdan ko‘ra, mijoz ertaga qanday taassurot bilan qaytishini o‘ylaymiz.",
    principle2: "Aniqlik va’dadan muhimroq",
    principle2d: "Avtomobil statusi, xususiyatlari va yo‘li qarordan oldin tushunarli bo‘lishi kerak.",
    principle3: "Natijagacha kuzatuv",
    principle3d: "Birinchi savoldan avtomobil mijozga yetguncha — bitta tushunarli va mas’uliyatli yo‘l.",
    todayKicker: "25 YIL → BUGUN",
    todayTitle: "O‘tmish tajribasi. Bugungi servis.",
    todayText: "Bugun ishonch munosabat bilan birga tizim orqali ham qo‘llab-quvvatlanadi: real avtomobillar katalogi, aniq statuslar, xalqaro yetkazib berish va Auto Sale Umar jamoasi bilan shaxsiy aloqa.",
    stat1: "Tajriba",
    stat1d: "Avtomobil sohasida 25 yil",
    stat2: "Yondashuv",
    stat2d: "Bosimsiz shaxsiy tanlov",
    stat3: "Tizim",
    stat3d: "Shourum + raqamli katalog",
    finalKicker: "AUTO SALE UMAR",
    finalTitle: "Davom etadigan ishonch.",
    finalText: "Avtomobilni onlayn tanlang yoki shourumga keling. Tarixni sizning keyingi avtomobilingiz bilan davom ettiramiz.",
    cars: "Avtomobillarni ko‘rish",
    visit: "Tashrifni bron qilish",
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

export default function TrustPage() {
  const { language, themeMode, resolvedTheme, changeLanguage, changeTheme } = usePublicPreferences();
  const c = copyForLanguage(COPY, language);
  const wordmark = resolvedTheme === "dark" ? "/brand/asu-wordmark-white.png" : "/brand/asu-wordmark-black.png";

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
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>{c.kicker}</p>
          <h1>{c.title}</h1>
          <p className={styles.heroIntro}>{c.intro}</p>
        </div>
        <div className={styles.heroYears} aria-label={c.yearsLabel}>
          <div className={styles.orangeGlow} aria-hidden="true" />
          <strong>{c.years}</strong>
          <span>{c.yearsLabel}</span>
          <img src="/brand/asu-wordmark-white.png" alt="Auto Sale Umar" />
        </div>
      </section>

      <section className={styles.storySection}>
        <div className={styles.storyImage}>
          <img src="/showroom/showroom-05.webp" alt="Auto Sale Umar showroom" />
          <div><span>25</span><small>YEARS OF EXPERIENCE</small></div>
        </div>
        <div className={styles.storyCopy}>
          <p className={styles.kicker}>{c.storyKicker}</p>
          <h2>{c.storyTitle}</h2>
          <div className={styles.storyParagraphs}>
            <p>{c.p1}</p>
            <p>{c.p2}</p>
            <p>{c.p3}</p>
          </div>
        </div>
      </section>

      <section className={styles.principlesSection}>
        <header className={styles.sectionHeading}>
          <p className={styles.kicker}>{c.principlesKicker}</p>
          <h2>{c.principlesTitle}</h2>
        </header>
        <div className={styles.principlesGrid}>
          <article>
            <span><Handshake /></span>
            <small>01</small>
            <h3>{c.principle1}</h3>
            <p>{c.principle1d}</p>
          </article>
          <article>
            <span><ShieldCheck /></span>
            <small>02</small>
            <h3>{c.principle2}</h3>
            <p>{c.principle2d}</p>
          </article>
          <article>
            <span><Route /></span>
            <small>03</small>
            <h3>{c.principle3}</h3>
            <p>{c.principle3d}</p>
          </article>
        </div>
      </section>

      <section className={styles.todaySection}>
        <div className={styles.todayCopy}>
          <p className={styles.kicker}>{c.todayKicker}</p>
          <h2>{c.todayTitle}</h2>
          <p>{c.todayText}</p>
        </div>
        <div className={styles.todayStats}>
          <div><CalendarRange /><span><b>{c.stat1}</b><small>{c.stat1d}</small></span></div>
          <div><Check /><span><b>{c.stat2}</b><small>{c.stat2d}</small></span></div>
          <div><CarFront /><span><b>{c.stat3}</b><small>{c.stat3d}</small></span></div>
        </div>
      </section>

      <section className={styles.showroomBanner}>
        <img src="/showroom/showroom-06.webp" alt="Auto Sale Umar showroom" />
        <div className={styles.showroomOverlay} />
        <div className={styles.showroomBannerCopy}>
          <img src="/brand/asu-wordmark-white.png" alt="Auto Sale Umar" />
          <p>{uiText(language, "25 лет опыта. Один стандарт — уважение к выбору клиента.", "25 yillik tajriba. Bitta standart — mijoz tanloviga hurmat.")}</p>
        </div>
      </section>

      <section className={styles.finalSection}>
        <div>
          <p className={styles.kicker}>{c.finalKicker}</p>
          <h2>{c.finalTitle}</h2>
          <p>{c.finalText}</p>
        </div>
        <div className={styles.finalActions}>
          <a className={styles.primaryAction} href="/cars/">{c.cars}<ArrowRight /></a>
          <a className={styles.secondaryAction} href="/booking/">{c.visit}</a>
        </div>
      </section>

      <footer className={styles.footer}>
        <img src={wordmark} alt="Auto Sale Umar" />
        <span>25 YEARS · AUTO SALE UMAR</span>
      </footer>
    </main>
  );
}
