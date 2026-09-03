"use client";

import { Gift, ImagePlus, Loader2, Save, Trash2 } from 'lucide-react';
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminChrome from '../_components/AdminChrome';
import { compressImageForUpload } from '../../_lib/compress-image';
import styles from './ramadan-gift.module.css';

type Language = 'ru' | 'uz';
type Theme = 'light' | 'dark';
type Role = 'super_admin' | 'admin' | 'sales_manager';
type Currency = 'USD' | 'UZS' | 'EUR';
type PhotoGroup = 'exterior' | 'interior';

interface MeResponse {
  user?: { role?: Role };
  error?: string;
}

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
  isFallback?: boolean;
}

interface ApiResponse {
  success?: boolean;
  error?: string;
  gift?: GiftPayload;
}

interface FormState {
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
  year: string;
  trim: string;
  exteriorColor: string;
  interiorColor: string;
  minPurchaseAmount: string;
  marketPrice: string;
  currency: Currency;
  instagramUrl: string;
  orderHref: string;
}

const TEXT = {
  ru: {
    title: 'Ramadan Gift',
    lead: 'Премиальный блок благодарности клиентам. Здесь настраивается карточка на главной, отдельная страница и галерея подарочного автомобиля.',
    saving: 'Сохраняем…',
    save: 'Сохранить Ramadan Gift',
    saved: 'Сохранено',
    active: 'Показывать блок на сайте',
    publicPreview: 'Публичный блок',
    publicPage: 'Открыть страницу',
    content: 'Контент и тексты',
    details: 'Автомобиль и условия',
    photos: 'Фотографии подарка',
    titleRu: 'Заголовок · RU',
    titleUz: 'Заголовок · UZ',
    subtitleRu: 'Подзаголовок / название авто · RU',
    subtitleUz: 'Подзаголовок / название авто · UZ',
    shortPhraseRu: 'Короткая фраза · RU',
    shortPhraseUz: 'Короткая фраза · UZ',
    descriptionRu: 'Подробное описание · RU',
    descriptionUz: 'Подробное описание · UZ',
    brand: 'Марка',
    model: 'Модель',
    year: 'Год',
    trim: 'Комплектация',
    exteriorColor: 'Цвет кузова',
    interiorColor: 'Цвет салона',
    minPurchaseAmount: 'Минимальная сумма покупки',
    marketPrice: 'Рыночная цена',
    currency: 'Валюта',
    instagramUrl: 'Instagram ссылка',
    orderHref: 'Ссылка кнопки «Заказать автомобиль»',
    uploadExterior: 'Добавить фото кузова',
    uploadInterior: 'Добавить фото салона',
    saveFirst: 'Сначала сохраните блок, затем загружайте фотографии.',
    uploading: 'Загрузка…',
    emptyPhotos: 'Пока нет загруженных фотографий. После сохранения можно добавить свои фотографии автомобиля.',
    delete: 'Удалить',
    cover: 'Обложка',
    heroBadge: 'Ежегодная программа благодарности клиентам',
    previewButton: 'Открыть страницу',
  },
  uz: {
    title: 'Ramadan Gift',
    lead: 'Mijozlar uchun premium minnatdorchilik bloki. Bu yerda bosh sahifadagi kartochka, alohida sahifa va sovg‘a avtomobil galereyasi boshqariladi.',
    saving: 'Saqlanmoqda…',
    save: 'Ramadan Gift’ni saqlash',
    saved: 'Saqlandi',
    active: 'Blokni saytda ko‘rsatish',
    publicPreview: 'Ommaviy blok',
    publicPage: 'Sahifani ochish',
    content: 'Kontent va matnlar',
    details: 'Avtomobil va shartlar',
    photos: 'Sovg‘a fotosuratlari',
    titleRu: 'Sarlavha · RU',
    titleUz: 'Sarlavha · UZ',
    subtitleRu: 'Avtomobil nomi · RU',
    subtitleUz: 'Avtomobil nomi · UZ',
    shortPhraseRu: 'Qisqa ibora · RU',
    shortPhraseUz: 'Qisqa ibora · UZ',
    descriptionRu: 'Batafsil tavsif · RU',
    descriptionUz: 'Batafsil tavsif · UZ',
    brand: 'Marka',
    model: 'Model',
    year: 'Yil',
    trim: 'Komplektatsiya',
    exteriorColor: 'Kuzov rangi',
    interiorColor: 'Salon rangi',
    minPurchaseAmount: 'Minimal xarid summasi',
    marketPrice: 'Bozor narxi',
    currency: 'Valyuta',
    instagramUrl: 'Instagram havolasi',
    orderHref: '“Avtomobil buyurtma qilish” tugmasi havolasi',
    uploadExterior: 'Kuzov suratlarini qo‘shish',
    uploadInterior: 'Salon suratlarini qo‘shish',
    saveFirst: 'Avval blokni saqlang, keyin fotosurat yuklang.',
    uploading: 'Yuklanmoqda…',
    emptyPhotos: 'Hozircha yuklangan suratlar yo‘q. Saqlagandan keyin avtomobil suratlarini qo‘shishingiz mumkin.',
    delete: 'O‘chirish',
    cover: 'Muqova',
    heroBadge: 'Mijozlarga yillik minnatdorchilik dasturi',
    previewButton: 'Sahifani ochish',
  },
} as const;

function giftToForm(gift: GiftPayload): FormState {
  return {
    isActive: gift.isActive,
    titleRu: gift.titleRu,
    titleUz: gift.titleUz,
    subtitleRu: gift.subtitleRu,
    subtitleUz: gift.subtitleUz,
    shortPhraseRu: gift.shortPhraseRu,
    shortPhraseUz: gift.shortPhraseUz,
    descriptionRu: gift.descriptionRu,
    descriptionUz: gift.descriptionUz,
    brand: gift.brand,
    model: gift.model,
    year: gift.year ? String(gift.year) : '',
    trim: gift.trim ?? '',
    exteriorColor: gift.exteriorColor ?? '',
    interiorColor: gift.interiorColor ?? '',
    minPurchaseAmount: String(gift.minPurchaseAmount),
    marketPrice: gift.marketPrice != null ? String(gift.marketPrice) : '',
    currency: gift.currency,
    instagramUrl: gift.instagramUrl ?? '',
    orderHref: gift.orderHref ?? '/compare/',
  };
}

function money(value: string, currency: Currency) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return '—';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency, maximumFractionDigits: 0 }).format(number);
}

export default function AdminRamadanGiftPage() {
  const [language, setLanguage] = useState<Language>('ru');
  const [theme, setTheme] = useState<Theme>('light');
  const [role, setRole] = useState<Role | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<PhotoGroup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [gift, setGift] = useState<GiftPayload | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const exteriorRef = useRef<HTMLInputElement | null>(null);
  const interiorRef = useRef<HTMLInputElement | null>(null);
  const c = TEXT[language];

  const applyTheme = useCallback((next: Theme) => {
    setTheme(next);
    try { localStorage.setItem('asu-theme', next); } catch {}
    document.documentElement.dataset.asuTheme = next;
    document.documentElement.style.colorScheme = next;
  }, []);

  useEffect(() => {
    try {
      const savedLanguage = localStorage.getItem('asu-language');
      setLanguage(savedLanguage === 'uz' ? 'uz' : 'ru');
      const savedTheme = localStorage.getItem('asu-theme');
      applyTheme(savedTheme === 'dark' ? 'dark' : 'light');
    } catch { applyTheme('light'); }
  }, [applyTheme]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const meResponse = await fetch('/api/me', { cache: 'no-store', credentials: 'same-origin' });
        const me = await meResponse.json().catch(() => null) as MeResponse | null;
        if (meResponse.status === 401) { location.replace('/admin/login/'); return; }
        if (!meResponse.ok) throw new Error(me?.error || 'Не удалось проверить сессию.');
        if (me?.user?.role === 'sales_manager') { location.replace('/admin/cars/'); return; }
        if (me?.user?.role !== 'admin' && me?.user?.role !== 'super_admin') throw new Error('Недостаточно прав.');
        if (!cancelled) {
          setRole(me.user.role ?? null);
          setAuthReady(true);
        }

        const response = await fetch('/api/ramadan-gift', { cache: 'no-store', credentials: 'same-origin' });
        const data = await response.json().catch(() => null) as ApiResponse | null;
        if (!response.ok || !data?.success || !data.gift) throw new Error(data?.error || 'Не удалось загрузить Ramadan Gift.');
        if (!cancelled) {
          setGift(data.gift);
          setForm(giftToForm(data.gift));
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Не удалось загрузить Ramadan Gift.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  function changeLanguage(next: Language) {
    setLanguage(next);
    try { localStorage.setItem('asu-language', next); } catch {}
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setSaved(false);
    setForm((current) => current ? { ...current, [key]: value } : current);
  }

  async function persist() {
    if (!form || saving) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch('/api/ramadan-gift', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          ...form,
          year: form.year || null,
          minPurchaseAmount: form.minPurchaseAmount || null,
          marketPrice: form.marketPrice || null,
        }),
      });
      const data = await response.json().catch(() => null) as ApiResponse | null;
      if (!response.ok || !data?.success || !data.gift) throw new Error(data?.error || 'Не удалось сохранить Ramadan Gift.');
      setGift(data.gift);
      setForm(giftToForm(data.gift));
      setSaved(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось сохранить Ramadan Gift.');
    } finally {
      setSaving(false);
    }
  }

  async function uploadFiles(group: PhotoGroup, files: FileList | null) {
    if (!gift?.id || !files?.length || uploading) return;
    setUploading(group);
    setError(null);
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const optimized = await compressImageForUpload(file);
        const formData = new FormData();
        formData.append('giftId', String(gift.id));
        formData.append('group', group);
        formData.append('sortOrder', String((gift.media?.length ?? 0) + index));
        formData.append('isCover', gift.media.length === 0 && index === 0 ? '1' : '0');
        formData.append('file', optimized.file, optimized.file.name);
        const response = await fetch('/api/ramadan-gift-media', { method: 'POST', credentials: 'same-origin', body: formData });
        const data = await response.json().catch(() => null) as { success?: boolean; error?: string } | null;
        if (!response.ok || !data?.success) throw new Error(data?.error || 'Не удалось загрузить фотографию.');
      }
      const refresh = await fetch('/api/ramadan-gift', { cache: 'no-store', credentials: 'same-origin' });
      const refreshed = await refresh.json().catch(() => null) as ApiResponse | null;
      if (refresh.ok && refreshed?.gift) setGift(refreshed.gift);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось загрузить фотографии.');
    } finally {
      setUploading(null);
      if (group === 'exterior' && exteriorRef.current) exteriorRef.current.value = '';
      if (group === 'interior' && interiorRef.current) interiorRef.current.value = '';
    }
  }

  async function deleteMedia(id: number) {
    if (!confirm(language === 'ru' ? 'Удалить эту фотографию?' : 'Ushbu suratni o‘chirasizmi?')) return;
    setError(null);
    try {
      const response = await fetch(`/api/ramadan-gift-media?id=${id}`, { method: 'DELETE', credentials: 'same-origin' });
      const data = await response.json().catch(() => null) as { success?: boolean; error?: string } | null;
      if (!response.ok || !data?.success) throw new Error(data?.error || 'Не удалось удалить фотографию.');
      const refresh = await fetch('/api/ramadan-gift', { cache: 'no-store', credentials: 'same-origin' });
      const refreshed = await refresh.json().catch(() => null) as ApiResponse | null;
      if (refresh.ok && refreshed?.gift) setGift(refreshed.gift);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось удалить фотографию.');
    }
  }

  const media = gift?.media ?? [];
  const cover = useMemo(() => media.find((item) => item.isCover) ?? media[0] ?? null, [media]);

  return (
    <main className={styles.page} data-theme={theme}>
      <AdminChrome current="ramadan" language={language} theme={theme} role={role} onLanguageChange={changeLanguage} onThemeChange={applyTheme} />

      <section className={styles.shell}>
        <div className={styles.heading}>
          <div>
            <p className={styles.kicker}>AUTO SALE UMAR / CONTROL SYSTEM</p>
            <h1>{c.title}</h1>
            <p>{c.lead}</p>
          </div>
          <div className={styles.topActions}>
            <a className={styles.ghostButton} href="/ramadan-gift/">{c.publicPage}</a>
            <button className={styles.saveButton} type="button" onClick={() => void persist()} disabled={!authReady || loading || saving || !form}>
              {saving ? <><Loader2 className={styles.spin} />{c.saving}</> : <><Save />{saved ? c.saved : c.save}</>}
            </button>
          </div>
        </div>

        {error ? <div className={styles.error}>{error}</div> : null}

        {loading || !form || !gift ? (
          <div className={styles.loadingCard}><Loader2 className={styles.spin} />Loading…</div>
        ) : (
          <div className={styles.grid}>
            <section className={styles.previewPanel}>
              <div className={styles.previewHero}>
                {cover ? <img src={cover.publicUrl} alt={form.subtitleRu} /> : <div className={styles.previewEmpty}><Gift /></div>}
                <div className={styles.previewOverlay} />
                <div className={styles.previewCopy}>
                  <span>{c.heroBadge}</span>
                  <strong>{language === 'ru' ? form.titleRu : form.titleUz}</strong>
                  <h2>{language === 'ru' ? form.subtitleRu : form.subtitleUz}</h2>
                  <p>{language === 'ru' ? form.shortPhraseRu : form.shortPhraseUz}</p>
                </div>
              </div>
              <div className={styles.previewMeta}>
                <label className={styles.toggleRow}>
                  <span>{c.active}</span>
                  <input type="checkbox" checked={form.isActive} onChange={(event) => setField('isActive', event.target.checked)} />
                </label>
                <div className={styles.priceRow}>
                  <div><small>{c.marketPrice}</small><strong>{money(form.marketPrice, form.currency)}</strong></div>
                  <div><small>{c.minPurchaseAmount}</small><strong>{money(form.minPurchaseAmount, form.currency)}</strong></div>
                </div>
                <a className={styles.previewLink} href="/ramadan-gift/">{c.previewButton}</a>
              </div>
            </section>

            <section className={styles.formPanel}>
              <div className={styles.cardSection}>
                <h3>{c.content}</h3>
                <div className={styles.formGrid}>
                  <label><span>{c.titleRu}</span><input value={form.titleRu} onChange={(event) => setField('titleRu', event.target.value)} /></label>
                  <label><span>{c.titleUz}</span><input value={form.titleUz} onChange={(event) => setField('titleUz', event.target.value)} /></label>
                  <label><span>{c.subtitleRu}</span><input value={form.subtitleRu} onChange={(event) => setField('subtitleRu', event.target.value)} /></label>
                  <label><span>{c.subtitleUz}</span><input value={form.subtitleUz} onChange={(event) => setField('subtitleUz', event.target.value)} /></label>
                  <label className={styles.full}><span>{c.shortPhraseRu}</span><input value={form.shortPhraseRu} onChange={(event) => setField('shortPhraseRu', event.target.value)} /></label>
                  <label className={styles.full}><span>{c.shortPhraseUz}</span><input value={form.shortPhraseUz} onChange={(event) => setField('shortPhraseUz', event.target.value)} /></label>
                  <label className={styles.full}><span>{c.descriptionRu}</span><textarea rows={5} value={form.descriptionRu} onChange={(event) => setField('descriptionRu', event.target.value)} /></label>
                  <label className={styles.full}><span>{c.descriptionUz}</span><textarea rows={5} value={form.descriptionUz} onChange={(event) => setField('descriptionUz', event.target.value)} /></label>
                </div>
              </div>

              <div className={styles.cardSection}>
                <h3>{c.details}</h3>
                <div className={styles.formGrid}>
                  <label><span>{c.brand}</span><input value={form.brand} onChange={(event) => setField('brand', event.target.value)} /></label>
                  <label><span>{c.model}</span><input value={form.model} onChange={(event) => setField('model', event.target.value)} /></label>
                  <label><span>{c.year}</span><input inputMode="numeric" value={form.year} onChange={(event) => setField('year', event.target.value)} /></label>
                  <label><span>{c.trim}</span><input value={form.trim} onChange={(event) => setField('trim', event.target.value)} /></label>
                  <label><span>{c.exteriorColor}</span><input value={form.exteriorColor} onChange={(event) => setField('exteriorColor', event.target.value)} /></label>
                  <label><span>{c.interiorColor}</span><input value={form.interiorColor} onChange={(event) => setField('interiorColor', event.target.value)} /></label>
                  <label><span>{c.minPurchaseAmount}</span><input inputMode="numeric" value={form.minPurchaseAmount} onChange={(event) => setField('minPurchaseAmount', event.target.value)} /></label>
                  <label><span>{c.marketPrice}</span><input inputMode="numeric" value={form.marketPrice} onChange={(event) => setField('marketPrice', event.target.value)} /></label>
                  <label><span>{c.currency}</span>
                    <select value={form.currency} onChange={(event) => setField('currency', event.target.value as Currency)}>
                      <option value="USD">USD</option>
                      <option value="UZS">UZS</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </label>
                  <label><span>{c.instagramUrl}</span><input value={form.instagramUrl} onChange={(event) => setField('instagramUrl', event.target.value)} placeholder="https://www.instagram.com/auto_sale_umar/" /></label>
                  <label className={styles.full}><span>{c.orderHref}</span><input value={form.orderHref} onChange={(event) => setField('orderHref', event.target.value)} placeholder="/compare/" /></label>
                </div>
              </div>

              <div className={styles.cardSection}>
                <div className={styles.sectionHeadRow}>
                  <h3>{c.photos}</h3>
                  {gift.id ? (
                    <div className={styles.uploadActions}>
                      <input ref={exteriorRef} type="file" accept="image/*" multiple hidden onChange={(event: ChangeEvent<HTMLInputElement>) => void uploadFiles('exterior', event.target.files)} />
                      <input ref={interiorRef} type="file" accept="image/*" multiple hidden onChange={(event: ChangeEvent<HTMLInputElement>) => void uploadFiles('interior', event.target.files)} />
                      <button type="button" onClick={() => exteriorRef.current?.click()} disabled={uploading !== null}><ImagePlus />{uploading === 'exterior' ? c.uploading : c.uploadExterior}</button>
                      <button type="button" onClick={() => interiorRef.current?.click()} disabled={uploading !== null}><ImagePlus />{uploading === 'interior' ? c.uploading : c.uploadInterior}</button>
                    </div>
                  ) : <p className={styles.smallNote}>{c.saveFirst}</p>}
                </div>
                {media.length ? (
                  <div className={styles.mediaGrid}>
                    {media.map((item) => (
                      <article className={styles.mediaCard} key={item.id}>
                        <img src={item.publicUrl} alt={form.subtitleRu} />
                        <div className={styles.mediaInfo}>
                          <span>{item.photoGroup === 'interior' ? 'Interior' : 'Exterior'}</span>
                          {item.isCover ? <b>{c.cover}</b> : null}
                        </div>
                        <button className={styles.deleteButton} type="button" onClick={() => void deleteMedia(item.id)}><Trash2 />{c.delete}</button>
                      </article>
                    ))}
                  </div>
                ) : <div className={styles.emptyMedia}>{c.emptyPhotos}</div>}
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
