"use client";

import { ArrowLeft, CarFront, ChevronRight, Menu, MessageCircle, Monitor, Moon, Sun, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { copyForLanguage, publicHtmlLang, type PublicLanguage } from "../_lib/public-language";
import styles from "./public-chrome.module.css";

export type { PublicLanguage } from "../_lib/public-language";
export type PublicThemeMode = "system" | "light" | "dark";
export type PublicResolvedTheme = "light" | "dark";

interface PublicChromeProps {
  language: PublicLanguage;
  themeMode: PublicThemeMode;
  resolvedTheme: PublicResolvedTheme;
  backHref?: string;
  onLanguageChange: (language: PublicLanguage) => void;
  onThemeChange: (theme: PublicThemeMode) => void;
}

const COPY = {
  ru: {
    open: "Открыть меню",
    close: "Закрыть меню",
    back: "Назад",
    cars: "Автомобили",
    showroom: "Шоурум",
    contacts: "Контакты",
    employees: "Сотрудники",
    language: "Язык",
    theme: "Тема",
    system: "Системная",
    light: "Светлая",
    dark: "Тёмная",
  },
  uz: {
    open: "Menyuni ochish",
    close: "Menyuni yopish",
    back: "Orqaga",
    cars: "Avtomobillar",
    showroom: "Shourum",
    contacts: "Kontaktlar",
    employees: "Xodimlar",
    language: "Til",
    theme: "Mavzu",
    system: "Tizim",
    light: "Yorug‘",
    dark: "Tungi",
  },
} as const;

export default function PublicChrome({
  language,
  themeMode,
  resolvedTheme,
  backHref,
  onLanguageChange,
  onThemeChange,
}: PublicChromeProps) {
  const [open, setOpen] = useState(false);
  const c = copyForLanguage(COPY, language);
  const wordmark = resolvedTheme === "dark" ? "/brand/asu-wordmark-white.png" : "/brand/asu-wordmark-black.png";

  useEffect(() => {
    document.documentElement.lang = publicHtmlLang(language);
  }, [language]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <>
      <header className={styles.chrome} data-theme={resolvedTheme}>
        {backHref ? (
          <a className={styles.control} href={backHref} aria-label={c.back}>
            <ArrowLeft />
          </a>
        ) : (
          <span className={styles.leadingSpacer} aria-hidden="true" />
        )}

        <a className={styles.brand} href="/" aria-label="Auto Sale Umar">
          <img src={wordmark} alt="Auto Sale Umar" />
        </a>

        <button
          className={styles.control}
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? c.close : c.open}
        >
          {open ? <X /> : <Menu />}
        </button>

        <section className={styles.drawer} data-open={open} aria-hidden={!open}>
          <nav className={styles.nav} aria-label="Auto Sale Umar">
            <a href="/#cars" onClick={closeMenu}><CarFront /><span>{c.cars}</span><ChevronRight /></a>
            <a href="/#showroom" onClick={closeMenu}><MessageCircle /><span>{c.showroom}</span><ChevronRight /></a>
            <a href="/#contacts" onClick={closeMenu}><MessageCircle /><span>{c.contacts}</span><ChevronRight /></a>
            <a href="/admin/login/" onClick={closeMenu}><Users /><span>{c.employees}</span><ChevronRight /></a>
          </nav>

          <div className={styles.settings}>
            <div className={styles.settingGroup}>
              <span>{c.language}</span>
              <div className={`${styles.segments} ${styles.languageSegments}`}>
                <button type="button" data-active={language === "ru"} onClick={() => onLanguageChange("ru")}>RU</button>
                <button type="button" data-active={language === "uz"} onClick={() => onLanguageChange("uz")}>UZ</button>
                <button type="button" data-active={language === "uz-cyrl"} onClick={() => onLanguageChange("uz-cyrl")}>ЎЗ</button>
              </div>
            </div>

            <div className={styles.settingGroup}>
              <span>{c.theme}</span>
              <div className={`${styles.segments} ${styles.themeSegments}`}>
                <button type="button" data-active={themeMode === "system"} onClick={() => onThemeChange("system")}><Monitor /><b>{c.system}</b></button>
                <button type="button" data-active={themeMode === "light"} onClick={() => onThemeChange("light")}><Sun /><b>{c.light}</b></button>
                <button type="button" data-active={themeMode === "dark"} onClick={() => onThemeChange("dark")}><Moon /><b>{c.dark}</b></button>
              </div>
            </div>
          </div>
        </section>
      </header>
      <button className={styles.backdrop} data-open={open} type="button" onClick={closeMenu} aria-label={c.close} />
    </>
  );
}
