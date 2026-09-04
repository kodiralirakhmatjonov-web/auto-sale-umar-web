"use client";

import { ArrowUpRight, MessageCircle, Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import PublicChrome, {
  type PublicLanguage,
  type PublicResolvedTheme,
  type PublicThemeMode,
} from "../_components/PublicChrome";
import { copyForLanguage, isPublicLanguage } from "../_lib/public-language";
import styles from "./it-team.module.css";

const COPY = {
  ru: {
    kicker: "AUTOSALE UMAR IT TEAM",
    title: "AutoSale Umar IT Team",
    founder: "Основатель — Abdulaziz.developer",
    subtitle: "Разработка · Дизайн · Цифровые решения",
    description:
      "Создаю премиальные сайты, мобильные приложения и цифровые решения для бизнеса. Проектирую системы, которые упрощают процессы, автоматизируют рутинную работу и помогают предпринимателям управлять бизнесом более понятно и эффективно — от интерфейсов и внутренних платформ до TV Mode и digital-экранов.",
    telegramLabel: "Telegram",
    projectLabel: "Собственный проект",
    write: "Написать в Telegram",
    openProject: "Открыть ceo.iumrah.app",
    stackTitle: "Что входит в AutoSale Umar IT Team",
    stack1: "Премиальные сайты и каталоги",
    stack2: "Мобильные приложения и внутренние платформы",
    stack3: "TV Mode, digital-экраны и системизация процессов",
  },
  uz: {
    kicker: "AUTOSALE UMAR IT TEAM",
    title: "AutoSale Umar IT Team",
    founder: "Asoschi — Abdulaziz.developer",
    subtitle: "Dasturlash · Dizayn · Raqamli yechimlar",
    description:
      "Biznes uchun premium saytlar, mobil ilovalar va raqamli yechimlar yarataman. Jarayonlarni soddalashtiradigan, kundalik rutinni avtomatlashtiradigan va tadbirkorlarga biznesni aniqroq hamda samaraliroq boshqarishga yordam beradigan tizimlarni loyihalayman — interfeyslar va ichki platformalardan tortib TV Mode va digital ekranlargacha.",
    telegramLabel: "Telegram",
    projectLabel: "Shaxsiy loyiha",
    write: "Telegram’da yozish",
    openProject: "ceo.iumrah.app ni ochish",
    stackTitle: "AutoSale Umar IT Team nimani qamrab oladi",
    stack1: "Premium saytlar va kataloglar",
    stack2: "Mobil ilovalar va ichki platformalar",
    stack3: "TV Mode, digital ekranlar va jarayonlarni tizimlashtirish",
  },
} as const;

function usePublicPreferences() {
  const [language, setLanguage] = useState<PublicLanguage>("ru");
  const [themeMode, setThemeMode] = useState<PublicThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<PublicResolvedTheme>("light");

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("asu-public-language");
      const savedTheme = localStorage.getItem("asu-public-theme");
      if (isPublicLanguage(savedLang)) setLanguage(savedLang);
      if (savedTheme === "system" || savedTheme === "light" || savedTheme === "dark") setThemeMode(savedTheme);
    } catch {}
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const next = themeMode === "system" ? (media.matches ? "dark" : "light") : themeMode;
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

export default function ITTeamPage() {
  const { language, themeMode, resolvedTheme, changeLanguage, changeTheme } = usePublicPreferences();
  const c = copyForLanguage(COPY, language);

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

      <section className={styles.cardShell}>
        <div className={styles.heroMedia}>
          <img src="/homepage/abdulaziz-developer.jpg" alt="Abdulaziz.developer" />
          <div className={styles.heroFade} aria-hidden="true" />
        </div>

        <div className={styles.content}>
          <p className={styles.kicker}>{c.kicker}</p>
          <h1>{c.title}</h1>
          <p className={styles.founder}>{c.founder}</p>
          <p className={styles.subtitle}>{c.subtitle}</p>
          <p className={styles.description}>{c.description}</p>

          <div className={styles.actions}>
            <a className={styles.primaryAction} href="https://t.me/saudiclub966" target="_blank" rel="noreferrer">
              <MessageCircle />
              <span>{c.write}</span>
            </a>
            <a className={styles.secondaryAction} href="https://ceo.iumrah.app" target="_blank" rel="noreferrer">
              <Monitor />
              <span>{c.openProject}</span>
              <ArrowUpRight />
            </a>
          </div>

          <div className={styles.quickGrid}>
            <a className={styles.quickCard} href="https://t.me/saudiclub966" target="_blank" rel="noreferrer">
              <div className={styles.quickIcon}><MessageCircle /></div>
              <div className={styles.quickCopy}>
                <span>{c.telegramLabel}</span>
                <strong>@saudiclub966</strong>
              </div>
              <ArrowUpRight />
            </a>
            <a className={styles.quickCard} href="https://ceo.iumrah.app" target="_blank" rel="noreferrer">
              <div className={styles.quickIcon}><Monitor /></div>
              <div className={styles.quickCopy}>
                <span>{c.projectLabel}</span>
                <strong>ceo.iumrah.app</strong>
              </div>
              <ArrowUpRight />
            </a>
          </div>

          <section className={styles.stackSection}>
            <h2>{c.stackTitle}</h2>
            <div className={styles.stackList}>
              <article>{c.stack1}</article>
              <article>{c.stack2}</article>
              <article>{c.stack3}</article>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
