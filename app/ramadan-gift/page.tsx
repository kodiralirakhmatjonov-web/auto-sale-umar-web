"use client";

import { ArrowRight, CalendarDays, ChevronRight, Gift, Instagram, Loader2, ShieldCheck, Sparkles, Stars, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import PublicChrome, { type PublicLanguage, type PublicResolvedTheme, type PublicThemeMode } from '../_components/PublicChrome';
import { copyForLanguage, isPublicLanguage, publicLocale } from '../_lib/public-language';
import styles from './ramadan-gift.module.css';

type Currency = 'USD' | 'UZS' | 'EUR';
type PhotoGroup = 'exterior' | 'interior';

interface GiftMedia {
  id: number;
  publicUrl: string;
  photoGroup: PhotoGroup;
  sortOrder: number;
  isCover: boolean;
}

interface GiftPayload {
  id: number | null;
  slug: string;
  isActive: boolean;
  titleRu: string;
  titleUz: string;
  subtitleRu: string;
  subtitleUz: string;
  shortPhraseRu: string;
  shortPhraseUz: string;
  descriptionRu: string;
  descriptionUz: string;
  brand: string;
  model: string;
  year: number | null;
  trim: string | null;
  exteriorColor: string | null;
  interiorColor: string | null;
  minPurchaseAmount: number;
  marketPrice: number | null;
  currency: Currency;
  instagramUrl: string | null;
  orderHref: string | null;
  media: GiftMedia[];
  updatedAt: string | null;
  updatedByName: string | null;
}

interface ApiResponse {
  success?: boolean;
  error?: string;
  gift?: GiftPayload;
}

const COPY = {
  ru: {
    eyebrow: 'AUTO SALE UMAR · RAMADAN GIFT',
    badge: 'Подарок клиентам Auto Sale Umar',
    back: 'Главная страница',
    bookVisit: 'Забронировать визит',
    becomeParticipant: 'Стать участником',
    orderCar: 'Заказать автомобиль',
    instagram: 'Instagram',
    storyTitle: 'Подарок, в котором чувствуется уважение к клиенту.',
    storyText: 'Ramadan Gift — это не лотерейный баннер, а премиальная программа благодарности клиентам Auto Sale Umar. Она подчёркивает отношение к тем, кто доверяет нам свой выбор.',
    rulesTitle: 'Как работает Ramadan Gift',
    rule1: 'Каждый клиент, который в течение года приобрёл автомобиль у Auto Sale Umar на сумму от 88 000 USD, автоматически участвует в программе.',
    rule2: 'В Рамадан один из клиентов получает подарочный Mercedes-Benz E-Class, оформленный как главная награда программы благодарности.',
    rule3: 'На странице показан конкретный автомобиль-подарок, его комплектация, ориентир по рыночной цене и актуальная визуальная подача.',
    highlightsTitle: 'Детали подарочного автомобиля',
    marketPrice: 'Рыночная цена',
    minPurchase: 'Минимальная сумма покупки',
    trim: 'Комплектация',
    exterior: 'Цвет кузова',
    interior: 'Цвет салона',
    galleryTitle: 'Галерея автомобиля',
    eligibilityTitle: 'Для тех, кто выбирает Auto Sale Umar всерьёз',
    eligibilityText: 'Программа задумана как знак уважения к клиентам, которые в течение года приняли серьёзное решение и доверили нам покупку автомобиля. Один автомобиль. Один клиент. Наша благодарность за доверие.',
    updated: 'Последнее обновление',
    fallbackDate: '—',
    noGift: 'Сейчас страница Ramadan Gift временно недоступна.',
    loading: 'Загружаем Ramadan Gift…',
  },
  uz: {
    eyebrow: 'AUTO SALE UMAR · RAMADAN GIFT',
    badge: 'Mijozlarga yillik minnatdorchilik dasturi',
    back: 'Bosh sahifa',
    bookVisit: 'Tashrifni band qilish',
    becomeParticipant: 'Ishtirokchi bo‘lish',
    orderCar: 'Avtomobil buyurtma qilish',
    instagram: 'Instagram',
    storyTitle: 'Mijozga hurmat seziladigan sovg‘a.',
    storyText: 'Ramadan Gift — bu oddiy lotereya banneri emas, balki Auto Sale Umar mijozlariga mo‘ljallangan premium minnatdorchilik dasturi. U bizga ishonib tanlov qilgan mijozlarga bo‘lgan munosabatni namoyon qiladi.',
    rulesTitle: 'Ramadan Gift qanday ishlaydi',
    rule1: 'Bir yil davomida Auto Sale Umar’dan 88 000 USD dan boshlab avtomobil xarid qilgan har bir mijoz avtomatik ravishda dastur ishtirokchisiga aylanadi.',
    rule2: 'Ramazon oyida mijozlardan biri dastur bosh sovg‘asi bo‘lgan Mercedes-Benz E-Class egasiga aylanadi.',
    rule3: 'Sahifada aynan sovg‘a avtomobil, uning komplektatsiyasi, taxminiy bozor narxi va premium vizual taqdimoti ko‘rsatiladi.',
    highlightsTitle: 'Sovg‘a avtomobil tafsilotlari',
    marketPrice: 'Bozor narxi',
    minPurchase: 'Minimal xarid summasi',
    trim: 'Komplektatsiya',
    exterior: 'Kuzov rangi',
    interior: 'Salon rangi',
    galleryTitle: 'Avtomobil galereyasi',
    eligibilityTitle: 'Auto Sale Umar’ni jiddiy tanlaganlar uchun',
    eligibilityText: 'Dastur yil davomida muhim qaror qabul qilgan va avtomobil xaridini bizga ishonib topshirgan mijozlarga nisbatan hurmat ifodasi sifatida yaratilgan. Bitta avtomobil. Bitta mijoz. Ishonchingiz uchun minnatdorchiligimiz.',
    updated: 'So‘nggi yangilanish',
    fallbackDate: '—',
    noGift: 'Hozircha Ramadan Gift sahifasi vaqtincha mavjud emas.',
    loading: 'Ramadan Gift yuklanmoqda…',
  },
} as const;

function formatMoney(value: number | null, currency: Currency, locale: string): string {
  if (!value) return '—';
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string | null, language: PublicLanguage): string {
  if (!value) return copyForLanguage(COPY, language).fallbackDate;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return copyForLanguage(COPY, language).fallbackDate;
  return new Intl.DateTimeFormat(publicLocale(language), { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}

export default function RamadanGiftPage() {
  const [language, setLanguage] = useState<PublicLanguage>('ru');
  const [themeMode, setThemeMode] = useState<PublicThemeMode>('light');
  const [resolvedTheme, setResolvedTheme] = useState<PublicResolvedTheme>('light');
  const [gift, setGift] = useState<GiftPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    try {
      const savedLanguage = localStorage.getItem('asu-public-language');
      if (isPublicLanguage(savedLanguage)) setLanguage(savedLanguage);
      const savedTheme = localStorage.getItem('asu-public-theme') as PublicThemeMode | null;
      const nextTheme = savedTheme === 'dark' || savedTheme === 'system' ? savedTheme : 'light';
      setThemeMode(nextTheme);
    } catch {}
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const next = themeMode === 'system' ? (media.matches ? 'dark' : 'light') : themeMode;
      setResolvedTheme(next);
      document.documentElement.style.colorScheme = next;
      document.documentElement.dataset.publicTheme = next;
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [themeMode]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/ramadan-gift', { cache: 'no-store', headers: { accept: 'application/json' } })
      .then((response) => response.json() as Promise<ApiResponse>)
      .then((data) => {
        if (!cancelled) setGift(data.success && data.gift ? data.gift : null);
      })
      .catch(() => {
        if (!cancelled) setGift(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const c = copyForLanguage(COPY, language);
  const media = gift?.media ?? [];
  const cover = useMemo(() => media.find((item) => item.isCover) ?? media[0] ?? null, [media]);

  useEffect(() => {
    if (!media.length) return;
    const coverIndex = media.findIndex((item) => item.isCover);
    setHeroIndex(coverIndex >= 0 ? coverIndex : 0);
  }, [media]);

  const activePhoto = media[heroIndex] ?? cover ?? null;

  function changeLanguage(next: PublicLanguage) {
    setLanguage(next);
    try { localStorage.setItem('asu-public-language', next); } catch {}
  }

  function changeTheme(next: PublicThemeMode) {
    setThemeMode(next);
    try { localStorage.setItem('asu-public-theme', next); } catch {}
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

      <section className={styles.shell}>
        {loading ? (
          <div className={styles.loadingCard}><Loader2 className={styles.spin} />{c.loading}</div>
        ) : !gift || !gift.isActive ? (
          <div className={styles.emptyCard}>{c.noGift}</div>
        ) : (
          <>
            <div className={styles.heroGrid}>
              <section className={styles.heroVisual}>
                {activePhoto ? <img src={activePhoto.publicUrl} alt={language === 'ru' ? gift.subtitleRu : gift.subtitleUz} /> : null}
                <div className={styles.heroShade} />
                <div className={styles.heroCaption}>
                  <span>{c.badge}</span>
                  <strong>{language === 'ru' ? gift.titleRu : gift.titleUz}</strong>
                </div>
              </section>

              <section className={styles.heroCard}>
                <p className={styles.eyebrow}>{c.eyebrow}</p>
                <h1>{language === 'ru' ? gift.subtitleRu : gift.subtitleUz}</h1>
                <p className={styles.lead}>{language === 'ru' ? gift.shortPhraseRu : gift.shortPhraseUz}</p>
                <p className={styles.story}>{language === 'ru' ? gift.descriptionRu : gift.descriptionUz}</p>

                <div className={styles.heroActions}>
                  <a className={styles.primaryButton} href="#rules"><Gift />{c.becomeParticipant}</a>
                  <a className={styles.secondaryButton} href="/booking/"><CalendarDays />{c.bookVisit}</a>
                  <a className={styles.secondaryButton} href={gift.orderHref || '/compare/'}><ArrowRight />{c.orderCar}</a>
                  <a className={styles.secondaryButton} href={gift.instagramUrl || 'https://www.instagram.com/auto_sale_umar/'} target="_blank" rel="noreferrer"><Instagram />{c.instagram}</a>
                </div>

                <div className={styles.statsGrid}>
                  <article>
                    <small>{c.marketPrice}</small>
                    <strong>{formatMoney(gift.marketPrice, gift.currency, publicLocale(language))}</strong>
                  </article>
                  <article>
                    <small>{c.minPurchase}</small>
                    <strong>{formatMoney(gift.minPurchaseAmount, gift.currency, publicLocale(language))}</strong>
                  </article>
                </div>
              </section>
            </div>

            <section className={styles.storyGrid}>
              <article className={styles.storyCard} id="rules">
                <div className={styles.cardHead}><Sparkles /><h2>{c.storyTitle}</h2></div>
                <p>{c.storyText}</p>
                <div className={styles.notePill}><ShieldCheck />{c.eligibilityText}</div>
              </article>

              <article className={styles.rulesCard}>
                <div className={styles.cardHead}><Trophy /><h2>{c.rulesTitle}</h2></div>
                <ol>
                  <li>{c.rule1}</li>
                  <li>{c.rule2}</li>
                  <li>{c.rule3}</li>
                </ol>
              </article>
            </section>

            <section className={styles.detailsGrid}>
              <article className={styles.detailCard}>
                <div className={styles.cardHead}><Stars /><h2>{c.highlightsTitle}</h2></div>
                <div className={styles.detailRows}>
                  <div><span>{c.trim}</span><strong>{gift.trim || '—'}</strong></div>
                  <div><span>{c.exterior}</span><strong>{gift.exteriorColor || '—'}</strong></div>
                  <div><span>{c.interior}</span><strong>{gift.interiorColor || '—'}</strong></div>
                  <div><span>{c.updated}</span><strong>{formatDate(gift.updatedAt, language)}</strong></div>
                </div>
              </article>

              <article className={styles.detailCard}>
                <div className={styles.cardHead}><Gift /><h2>{c.eligibilityTitle}</h2></div>
                <p className={styles.detailText}>{c.eligibilityText}</p>
                <div className={styles.inlineActions}>
                  <a href="#gallery">{c.galleryTitle}<ChevronRight /></a>
                  <a href="/booking/">{c.bookVisit}<ChevronRight /></a>
                </div>
              </article>
            </section>

            <section className={styles.gallerySection} id="gallery">
              <div className={styles.galleryHead}>
                <h2>{c.galleryTitle}</h2>
                <p>{gift.brand} {gift.model}{gift.year ? ` · ${gift.year}` : ''}</p>
              </div>
              <div className={styles.thumbRail}>
                {media.map((item, index) => (
                  <button key={item.id} className={styles.thumbButton} data-active={index === heroIndex} type="button" onClick={() => setHeroIndex(index)}>
                    <img src={item.publicUrl} alt={`${gift.brand} ${gift.model}`} />
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
