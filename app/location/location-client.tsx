"use client";

import { useEffect, useState } from "react";
import { copyForLanguage, isPublicLanguage, publicHtmlLang, type PublicLanguage } from "../_lib/public-language";
import styles from "./location.module.css";

const YANDEX_MAPS_URL = "https://yandex.ru/maps/org/auto_sale_umar/98317002086?si=y1pjpr56py0hyc8ar2j2cw1t40";

const COPY = {
  ru: {
    home: "На главную",
    kicker: "AUTO SALE UMAR · TASHKENT",
    title: "Локация\nшоурума.",
    lead: "Приезжайте посмотреть автомобиль в спокойной обстановке. Маршрут до Auto Sale Umar открывается одним нажатием.",
    maps: "Открыть в Яндекс Картах",
    book: "Забронировать визит",
    location: "ЛОКАЦИЯ",
    locationValue: "Ташкент · Auto Sale Umar",
    linksLabel: "Основные разделы Auto Sale Umar",
    cars: "Автомобили",
    carsText: "В наличии и в пути",
    showroom: "Шоурум",
    showroomText: "Пространство Auto Sale Umar",
    route: "Маршрут",
    routeText: "Открыть Яндекс Карты ↗",
    galleryKicker: "ШОУРУМ",
    galleryTitle: "Сначала почувствуйте автомобиль.",
    galleryText: "Посмотрите детали, салон и комплектацию вживую, а команда шоурума подготовит автомобиль к вашему визиту.",
    visitKicker: "ПЕРЕД ВИЗИТОМ",
    visitTitle: "Мы подготовим автомобиль заранее.",
    visitText: "Выберите удобное время или свяжитесь с командой Auto Sale Umar напрямую.",
    footerLabel: "Основные разделы",
    footerLocation: "Auto Sale Umar · Ташкент",
    showroomAlt: "Шоурум Auto Sale Umar в Ташкенте",
    interiorAlt: "Интерьер шоурума Auto Sale Umar",
    carsAlt: "Автомобили в шоуруме Auto Sale Umar",
    loungeAlt: "Клиентская зона Auto Sale Umar",
  },
  uz: {
    home: "Bosh sahifaga",
    kicker: "AUTO SALE UMAR · TOSHKENT",
    title: "Shourum\nmanzili.",
    lead: "Avtomobilni xotirjam muhitda ko‘rish uchun tashrif buyuring. Auto Sale Umar manziliga yo‘nalish bir bosishda ochiladi.",
    maps: "Yandex Xaritalarda ochish",
    book: "Tashrifni band qilish",
    location: "MANZIL",
    locationValue: "Toshkent · Auto Sale Umar",
    linksLabel: "Auto Sale Umar asosiy bo‘limlari",
    cars: "Avtomobillar",
    carsText: "Mavjud va yo‘ldagi avtomobillar",
    showroom: "Shourum",
    showroomText: "Auto Sale Umar makoni",
    route: "Yo‘nalish",
    routeText: "Yandex Xaritalarni ochish ↗",
    galleryKicker: "SHOURUM",
    galleryTitle: "Avval avtomobilni his qiling.",
    galleryText: "Detallar, salon va komplektatsiyani jonli ko‘ring. Shourum jamoasi avtomobilni tashrifingizga oldindan tayyorlaydi.",
    visitKicker: "TASHRIF OLDIDAN",
    visitTitle: "Avtomobilni oldindan tayyorlaymiz.",
    visitText: "Qulay vaqtni tanlang yoki Auto Sale Umar jamoasi bilan to‘g‘ridan-to‘g‘ri bog‘laning.",
    footerLabel: "Asosiy bo‘limlar",
    footerLocation: "Auto Sale Umar · Toshkent",
    showroomAlt: "Toshkentdagi Auto Sale Umar shourumi",
    interiorAlt: "Auto Sale Umar shourumi interyeri",
    carsAlt: "Auto Sale Umar shourumidagi avtomobillar",
    loungeAlt: "Auto Sale Umar mijozlar zonasi",
  },
} as const;

export default function LocationClient() {
  const [language, setLanguage] = useState<PublicLanguage>("ru");

  useEffect(() => {
    try {
      const storedLanguage = localStorage.getItem("asu-public-language");
      if (isPublicLanguage(storedLanguage)) setLanguage(storedLanguage);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = publicHtmlLang(language);
  }, [language]);

  const c = copyForLanguage(COPY, language);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a className={styles.back} href="/" aria-label={c.home}>←</a>
        <a className={styles.brand} href="/" aria-label="Auto Sale Umar">
          <img src="/brand/asu-wordmark-black.png" alt="Auto Sale Umar" />
        </a>
        <span className={styles.headerSpacer} aria-hidden="true" />
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>{c.kicker}</p>
          <h1>{c.title.split("\n").map((line, index) => <span key={line}>{index ? <br /> : null}{line}</span>)}</h1>
          <p className={styles.lead}>{c.lead}</p>
          <div className={styles.actions}>
            <a className={styles.primary} href={YANDEX_MAPS_URL} target="_blank" rel="noreferrer">
              {c.maps} <span>↗</span>
            </a>
            <a className={styles.secondary} href="/booking/">{c.book}</a>
          </div>
        </div>

        <div className={styles.heroMedia}>
          <img src="/showroom/showroom-01.webp" alt={c.showroomAlt} />
          <div className={styles.locationBadge}>
            <span>{c.location}</span>
            <strong>{c.locationValue}</strong>
          </div>
        </div>
      </section>

      <section className={styles.linkSection} aria-label={c.linksLabel}>
        <a href="/#stock"><span>01</span><strong>{c.cars}</strong><small>{c.carsText}</small></a>
        <a href="/#showroom"><span>02</span><strong>{c.showroom}</strong><small>{c.showroomText}</small></a>
        <a href={YANDEX_MAPS_URL} target="_blank" rel="noreferrer"><span>03</span><strong>{c.route}</strong><small>{c.routeText}</small></a>
      </section>

      <section className={styles.gallery}>
        <div className={styles.galleryCopy}>
          <p className={styles.kicker}>{c.galleryKicker}</p>
          <h2>{c.galleryTitle}</h2>
          <p>{c.galleryText}</p>
        </div>
        <div className={styles.galleryRail}>
          <img src="/showroom/showroom-02.webp" alt={c.interiorAlt} loading="lazy" />
          <img src="/showroom/showroom-03.webp" alt={c.carsAlt} loading="lazy" />
          <img src="/showroom/showroom-04.webp" alt={c.loungeAlt} loading="lazy" />
        </div>
      </section>

      <section className={styles.visitCard}>
        <div>
          <p className={styles.kicker}>{c.visitKicker}</p>
          <h2>{c.visitTitle}</h2>
          <p>{c.visitText}</p>
        </div>
        <div className={styles.visitActions}>
          <a href="/booking/">{c.book}</a>
          <a href="tel:+998771155553">+998 77 115 55 53</a>
        </div>
      </section>

      <footer className={styles.footer}>
        <img src="/brand/asu-wordmark-black.png" alt="Auto Sale Umar" />
        <nav aria-label={c.footerLabel}>
          <a href="/#stock">{c.cars}</a>
          <a href="/#showroom">{c.showroom}</a>
          <a href="/location/" aria-current="page">{c.location}</a>
        </nav>
        <p>{c.footerLocation}<br />© 2026</p>
      </footer>
    </main>
  );
}
