"use client";

import {
  ArrowLeftRight,
  ArrowUpRight,
  CalendarDays,
  CarFront,
  ChevronRight,
  Instagram,
  MapPin,
  Menu,
  MessageCircle,
  Monitor,
  Moon,
  Phone,
  Search,
  Share2,
  Ship,
  Sparkles,
  Sun,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { shareCar, warmShareImage } from "./_lib/share-car";
import styles from "./home.module.css";

type Language = "ru" | "uz";
type ThemeMode = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";
type CarStatus = "in_stock" | "in_showroom" | "in_transit" | "made_to_order" | "reserved" | "sold" | "hidden";

interface CatalogPhoto {
  id: number;
  url: string;
  isCover: boolean;
  sortOrder: number;
}

interface CatalogVariant {
  id: number;
  exteriorColorName: string | null;
  exteriorSwatch: string;
  interiorColorName: string | null;
  interiorSwatch: string;
  photos: CatalogPhoto[];
}

interface CatalogCar {
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
  currency: "USD" | "UZS" | "EUR";
  priceOnRequest: boolean;
  engineText: string | null;
  shortDescriptionRu: string;
  shortDescriptionUz: string;
  coverUrl: string | null;
  weeklyViews: number;
  variants?: CatalogVariant[];
}

interface CatalogResponse {
  success?: boolean;
  cars?: CatalogCar[];
}

interface RamadanGiftMedia {
  id: number;
  publicUrl: string;
  photoGroup: "exterior" | "interior";
  sortOrder: number;
  isCover: boolean;
}

interface RamadanGiftPayload {
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
  currency: "USD" | "UZS" | "EUR";
  instagramUrl: string | null;
  orderHref: string | null;
  media: RamadanGiftMedia[];
}

interface RamadanGiftResponse {
  success?: boolean;
  gift?: RamadanGiftPayload;
}

interface HomeMediaItem {
  key: string;
  url: string;
  size: number;
  uploadedAt: string | null;
  brand: string;
  model: string;
  price: number | null;
  currency: "USD" | "UZS" | "EUR";
  priceOnRequest: boolean;
  status: Exclude<CarStatus, "sold" | "hidden">;
}

interface HomeMediaResponse {
  success?: boolean;
  videos?: HomeMediaItem[];
}

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

const MARKETS = [
  { flag: "🇺🇸", ru: "США", uz: "AQSH" },
  { flag: "🇨🇦", ru: "Канада", uz: "Kanada" },
  { flag: "🇰🇷", ru: "Корея", uz: "Koreya" },
  { flag: "🇦🇪", ru: "ОАЭ", uz: "BAA" },
  { flag: "🇪🇺", ru: "Европа", uz: "Yevropa" },
  { flag: "🇬🇧", ru: "Великобритания", uz: "Buyuk Britaniya" },
  { flag: "🇦🇺", ru: "Австралия", uz: "Avstraliya" },
];

const SHOWROOM_STORIES = [
  {
    image: "/showroom/showroom-01.webp",
    ruTitle: "Тишина снаружи. Характер внутри.",
    ruText: "Пространство, где автомобиль говорит сам за себя. Без лишнего шума, давления и спешки.",
    uzTitle: "Tashqarida sokinlik. Ichkarida xarakter.",
    uzText: "Avtomobil o‘zi haqida gapiradigan makon. Ortiqcha shovqin, bosim va shoshilishsiz.",
  },
  {
    image: "/showroom/showroom-02.webp",
    ruTitle: "Комфорт начинается до поездки.",
    ruText: "Спокойная клиентская зона, персональное внимание и время для обдуманного решения.",
    uzTitle: "Qulaylik safardan oldin boshlanadi.",
    uzText: "Sokin mijozlar zonasi, shaxsiy e’tibor va o‘ylangan qaror uchun yetarli vaqt.",
  },
  {
    image: "/showroom/showroom-03.webp",
    ruTitle: "Свет подчёркивает главное.",
    ruText: "Архитектура шоурума раскрывает линии автомобиля, материалы и детали без визуального шума.",
    uzTitle: "Yorug‘lik asosiy narsani ko‘rsatadi.",
    uzText: "Shourum arxitekturasi avtomobil chiziqlari, materiallari va detallarini vizual shovqinsiz ochib beradi.",
  },
  {
    image: "/showroom/showroom-04.webp",
    ruTitle: "Выбирайте не из доступного. Выбирайте своё.",
    ruText: "Подберём модель, комплектацию и организуем путь автомобиля до передачи ключей.",
    uzTitle: "Mavjudidan emas. O‘zingiznikini tanlang.",
    uzText: "Model va komplektatsiyani tanlaymiz, avtomobil yo‘lini kalit topshirilgunga qadar tashkil qilamiz.",
  },
  {
    image: "/showroom/showroom-05.webp",
    ruTitle: "Доверие строится на деталях.",
    ruText: "Прозрачный статус автомобиля, серьёзное сопровождение и правильное отношение к клиенту.",
    uzTitle: "Ishonch detallardan quriladi.",
    uzText: "Avtomobilning aniq statusi, jiddiy kuzatuv va mijozga to‘g‘ri munosabat.",
  },
  {
    image: "/showroom/showroom-06.webp",
    ruTitle: "Цифровая витрина. Живой шоурум.",
    ruText: "Каталог, актуальные статусы и автомобили работают как единая система прямо в пространстве Auto Sale Umar.",
    uzTitle: "Raqamli vitrina. Jonli shourum.",
    uzText: "Katalog, dolzarb statuslar va avtomobillar Auto Sale Umar makonida yagona tizim sifatida ishlaydi.",
  },
] as const;

const DIGITAL_EXPERIENCE_MEDIA = [
  {
    image: "/homepage/digital-ecosystem-display.png",
    ruTitle: "Главная витрина",
    ruText: "Премиальная подача Auto Sale Umar на большом экране.",
    uzTitle: "Asosiy vitrina",
    uzText: "Auto Sale Umar’ning katta ekrandagi premium taqdimoti.",
  },
  {
    image: "/homepage/digital-ecosystem-tablet.png",
    ruTitle: "Приложение и iPad",
    ruText: "Каталог и мобильный интерфейс работают как единая система.",
    uzTitle: "Ilova va iPad",
    uzText: "Katalog va mobil interfeys yagona tizim sifatida ishlaydi.",
  },
  {
    image: "/homepage/digital-ecosystem-laptop.png",
    ruTitle: "Каталог на ноутбуке",
    ruText: "Фильтры, карточки и поиск автомобиля доступны в веб-версии.",
    uzTitle: "Noutbukdagi katalog",
    uzText: "Filtrlar, kartalar va qidiruv veb-versiyada ishlaydi.",
  },
  {
    image: "/homepage/digital-ecosystem-stage.png",
    ruTitle: "Единая презентация",
    ruText: "Сайт, приложение и визуальная подача работают в одном стиле.",
    uzTitle: "Yagona taqdimot",
    uzText: "Sayt, ilova va vizual taqdimot bir uslubda ishlaydi.",
  },
] as const;

const COPY = {
  ru: {
    menu: "Меню",
    close: "Закрыть",
    cars: "Автомобили",
    employees: "Сотрудники",
    showroomMenu: "Шоурум",
    contacts: "Контакты",
    language: "Язык",
    theme: "Тема",
    system: "Системная",
    light: "Светлая",
    dark: "Тёмная",
    skip: "Пропустить",
    heroKicker: "AUTO SALE UMAR · TASHKENT",
    heroTitle: "Автомобиль,\nвыбранный точно.",
    heroText: "Новые автомобили в наличии и в пути. Международный подбор, прозрачный статус и персональное сопровождение.",
    seeCars: "Смотреть автомобили",
    contact: "Связаться",
    brandsKicker: "ВЫБЕРИТЕ МАРКУ",
    brandsTitle: "Начните с характера.",
    brandsText: "Коллекция формируется из автомобилей, которые действительно есть в базе Auto Sale Umar.",
    showroomCarsKicker: "В ШОУРУМЕ",
    showroomCarsTitle: "Можно посмотреть сегодня.",
    showroomCarsText: "Автомобили, которые сейчас находятся в шоуруме и доступны для просмотра.",
    stockKicker: "В НАЛИЧИИ",
    stockTitle: "Без ожидания поставки.",
    stockText: "Автомобили в шоуруме и на складе, которые можно купить без ожидания приезда.",
    transitKicker: "В ПУТИ",
    transitTitle: "Следующее поступление.",
    transitText: "Следите за автомобилями, которые уже направляются в шоурум.",
    ramadanGiftKicker: "RAMADAN GIFT",
    ramadanGiftTitle: "Премиальный подарок как знак уважения.",
    ramadanGiftText: "Ramadan Gift от Auto Sale Umar — автомобиль в знак благодарности нашим клиентам. Один автомобиль. Один клиент. Благодарность за доверие.",
    ramadanGiftAction: "Открыть страницу",
    emptyShowroom: "Сейчас опубликованных автомобилей в шоуруме нет.",
    emptyStock: "Сейчас опубликованных автомобилей в наличии нет.",
    emptyTransit: "Сейчас опубликованных автомобилей в пути нет.",
    requestKicker: "ПЕРСОНАЛЬНЫЙ ПОДБОР",
    requestTitle: "Не нашли нужный автомобиль?",
    requestText: "Укажите марку, модель, бюджет и срок покупки. Команда Auto Sale Umar начнёт поиск под ваш запрос.",
    requestAction: "Найти автомобиль",
    compareKicker: "СРАВНИТЕ ПЕРЕД ВЫБОРОМ",
    compareTitle: "Два автомобиля. Один понятный выбор.",
    compareText: "Сопоставьте цену, характеристики и комплектации реальных автомобилей Auto Sale Umar. Консультант поможет разобраться в деталях только по вашему запросу.",
    compareAction: "Сравнить автомобили",
    compareAI: "Проверка комплектаций и официальных данных",
    seeAll: "Посмотреть все",
    trustKicker: "ПОЧЕМУ AUTO SALE UMAR",
    trustTitle: "Спокойствие строится на деталях.",
    trust1: "Статус без догадок",
    trust1d: "В наличии, в пути или в резерве — состояние автомобиля видно сразу.",
    trust2: "Конкретный автомобиль",
    trust2d: "Фотографии, цвета и данные относятся к реальной карточке автомобиля.",
    trust3: "Персональное сопровождение",
    trust3d: "От первого вопроса до передачи автомобиля — один понятный контакт с шоурумом.",
    trust25Kicker: "25 ЛЕТ В АВТОМОБИЛЬНОЙ СФЕРЕ",
    trust25Title: "Доверие, которое выдерживает время.",
    trust25Text: "Опыт Auto Sale Umar — это не цифра ради цифры. Это привычка отвечать за выбор, детали и результат.",
    trust25Action: "Наша история",
    showroomKicker: "О ШОУРУМЕ",
    showroomTitle: "Пространство для спокойного выбора.",
    showroomText: "Автомобиль остаётся в центре внимания, а атмосфера даёт время рассмотреть детали и принять решение без спешки.",
    bookVisit: "Забронировать визит",
    bookVisitText: "Выберите дату, время и автомобиль — команда шоурума увидит бронирование в Control System и подготовит визит.",
    locationKicker: "МЕСТОПОЛОЖЕНИЕ",
    locationTitle: "Ваш новый автомобиль ближе, чем кажется.",
    locationText: "Откройте маршрут в Яндекс Картах и приезжайте на персональный просмотр.",
    route: "Построить маршрут",
    location: "Ташкент · Auto Sale Umar",
    exportKicker: "МЕЖДУНАРОДНАЯ ПОСТАВКА",
    exportTitle: "Ищем автомобиль там, где он есть.",
    exportText: "Привозим новые автомобили под заказ из США, Канады, Кореи, ОАЭ, Европы, Великобритании и Австралии. Подбираем конкретную комплектацию и сопровождаем автомобиль на всём пути до прибытия.",
    exportStep1: "Подбор под задачу",
    exportStep1d: "Ищем нужную модель, комплектацию и цвет на подходящем рынке.",
    exportStep2: "Понятный путь",
    exportStep2d: "Фиксируем источник поставки и поддерживаем актуальный статус автомобиля.",
    exportStep3: "До передачи ключей",
    exportStep3d: "Сопровождаем логистику и держим клиента в курсе до прибытия автомобиля.",
    exportNote: "Страна и маршрут поставки зависят от выбранного автомобиля, комплектации и условий конкретного рынка.",
    digitalKicker: "ЭКОСИСТЕМА AUTO SALE UMAR",
    digitalTitle: "Сайт и приложение работают как одна система.",
    digitalText: "Auto Sale Umar развивает собственную цифровую экосистему: сайт, мобильный интерфейс, каталог и карточки автомобилей связаны в единую логику. Это даёт клиенту более понятный путь выбора, а команде — единый цифровой контур работы.",
    digitalFeature1: "Единая база автомобилей",
    digitalFeature1d: "Каталог, статусы, цены и карточки автомобилей синхронно работают в одном цифровом контуре.",
    digitalFeature2: "Сайт и мобильный интерфейс",
    digitalFeature2d: "Клиент может смотреть автомобили, фильтровать каталог и отправлять запрос из удобного устройства.",
    digitalFeature3: "Премиальная подача",
    digitalFeature3d: "Экосистема поддерживает единый стиль Auto Sale Umar — от презентации до выбора конкретного автомобиля.",
    digitalPrimaryAction: "Открыть каталог",
    digitalSecondaryAction: "Оставить запрос",
    soldKicker: "УЖЕ НАШЛИ СВОИХ ВЛАДЕЛЬЦЕВ",
    soldTitle: "Эти автомобили уже проданы.",
    soldText: "Понравилась модель или комплектация? Мы можем подобрать и привезти такой же автомобиль под заказ.",
    soldAction: "Заказать такой же",
    soldStatus: "Продан",
    contactsKicker: "КОНТАКТЫ",
    contactsTitle: "Продолжим там, где удобно вам.",
    contactsText: "Instagram остаётся главным каналом обзоров. Для консультации можно написать или позвонить напрямую.",
    instagram: "Instagram",
    telegram: "Telegram",
    whatsapp: "WhatsApp",
    call: "Позвонить",
    itTeamTitle: "AutoSale Umar IT Team",
    itTeamFounder: "Основатель — Abdulaziz.developer",
    itTeamSummary: "Разработка, дизайн и цифровые решения для Auto Sale Umar.",
    itTeamAction: "Открыть страницу",
    footer: "Auto Sale Umar · Премиальный автомобильный шоурум · Ташкент",
    priceRequest: "Цена по запросу",
    showroomStatus: "В шоуруме",
    inStockStatus: "В наличии",
    transitStatus: "В пути",
    orderStatus: "Под заказ",
    reserveStatus: "Резерв",
    color: "Цвет",
  },
  uz: {
    menu: "Menyu",
    close: "Yopish",
    cars: "Avtomobillar",
    employees: "Xodimlar",
    showroomMenu: "Shourum",
    contacts: "Kontaktlar",
    language: "Til",
    theme: "Mavzu",
    system: "Tizim",
    light: "Yorug‘",
    dark: "Tungi",
    skip: "O‘tkazib yuborish",
    heroKicker: "AUTO SALE UMAR · TOSHKENT",
    heroTitle: "Aniq tanlangan\navtomobil.",
    heroText: "Mavjud va yo‘ldagi yangi avtomobillar. Xalqaro tanlov, shaffof status va shaxsiy kuzatuv.",
    seeCars: "Avtomobillarni ko‘rish",
    contact: "Bog‘lanish",
    brandsKicker: "MARKANI TANLANG",
    brandsTitle: "Xarakterdan boshlang.",
    brandsText: "Kolleksiya Auto Sale Umar bazasida haqiqatan mavjud bo‘lgan avtomobillardan shakllanadi.",
    showroomCarsKicker: "SHOURUMDA",
    showroomCarsTitle: "Bugun ko‘rish mumkin.",
    showroomCarsText: "Hozir shourumda turgan va ko‘rish uchun mavjud avtomobillar.",
    stockKicker: "MAVJUD",
    stockTitle: "Yetkazib berishni kutmasdan.",
    stockText: "Shourum va ombordagi, kelishini kutmasdan xarid qilish mumkin bo‘lgan avtomobillar.",
    transitKicker: "YO‘LDA",
    transitTitle: "Keyingi kelish.",
    transitText: "Shourumga yo‘l olgan avtomobillarni kuzating.",
    ramadanGiftKicker: "RAMADAN GIFT",
    ramadanGiftTitle: "Hurmat belgisi bo‘lgan premium sovg‘a.",
    ramadanGiftText: "Auto Sale Umardan Ramadan Gift — mijozlarimizga minnatdorchilik ramzi bo‘lgan avtomobil. Bitta avtomobil. Bitta mijoz. Ishonch uchun minnatdorchilik.",
    ramadanGiftAction: "Sahifani ochish",
    emptyShowroom: "Hozir shourumda ommaviy katalogga chiqarilgan avtomobil yo‘q.",
    emptyStock: "Hozir ommaviy katalogda mavjud avtomobil yo‘q.",
    emptyTransit: "Hozir ommaviy katalogda yo‘ldagi avtomobil yo‘q.",
    requestKicker: "SHAXSIY TANLOV",
    requestTitle: "Kerakli avtomobilni topmadingizmi?",
    requestText: "Marka, model, budjet va xarid muddatini kiriting. Auto Sale Umar jamoasi siz uchun qidiruvni boshlaydi.",
    requestAction: "Avtomobil topish",
    compareKicker: "TANLOVDAN OLDIN SOLISHTIRING",
    compareTitle: "Ikki avtomobil. Bitta tushunarli tanlov.",
    compareText: "Auto Sale Umar’dagi aniq avtomobillarning narxi, xususiyatlari va komplektatsiyasini solishtiring. Maslahatchi tafsilotlarni faqat siz so‘raganingizda tekshiradi.",
    compareAction: "Avtomobillarni solishtirish",
    compareAI: "Komplektatsiya va rasmiy ma’lumotlarni tekshirish",
    seeAll: "Barchasini ko‘rish",
    trustKicker: "NEGA AUTO SALE UMAR",
    trustTitle: "Xotirjamlik tafsilotlardan boshlanadi.",
    trust1: "Aniq status",
    trust1d: "Mavjud, yo‘lda yoki rezervda — avtomobil holati darhol ko‘rinadi.",
    trust2: "Aniq avtomobil",
    trust2d: "Suratlar, ranglar va ma’lumotlar haqiqiy avtomobil kartasiga tegishli.",
    trust3: "Shaxsiy kuzatuv",
    trust3d: "Birinchi savoldan kalit topshirilguncha — shourum bilan bitta tushunarli aloqa.",
    trust25Kicker: "AVTOMOBIL SOHASIDA 25 YIL",
    trust25Title: "Vaqt sinovidan o‘tgan ishonch.",
    trust25Text: "Auto Sale Umar tajribasi shunchaki raqam emas. Bu tanlov, tafsilot va natija uchun javob berish odati.",
    trust25Action: "Bizning tarix",
    showroomKicker: "SHOURUM HAQIDA",
    showroomTitle: "Xotirjam tanlov uchun makon.",
    showroomText: "Avtomobil markazda qoladi, muhit esa detallarni ko‘rish va shoshilmasdan qaror qilish uchun vaqt beradi.",
    bookVisit: "Tashrifni band qilish",
    bookVisitText: "Sana, vaqt va avtomobilni tanlang — shourum jamoasi band qilishni Control System’da ko‘radi va tashrifni tayyorlaydi.",
    locationKicker: "MANZIL",
    locationTitle: "Yangi avtomobilingiz o‘ylagandan ham yaqin.",
    locationText: "Yandex Xaritalarda yo‘nalishni oching va shaxsiy ko‘rikka tashrif buyuring.",
    route: "Yo‘nalishni ochish",
    location: "Toshkent · Auto Sale Umar",
    exportKicker: "XALQARO YETKAZIB BERISH",
    exportTitle: "Avtomobil qayerda bo‘lsa, o‘sha yerdan izlaymiz.",
    exportText: "AQSH, Kanada, Koreya, BAA, Yevropa, Buyuk Britaniya va Avstraliyadan yangi avtomobillarni buyurtma asosida olib kelamiz. Kerakli komplektatsiyani tanlaymiz va avtomobil yo‘lini kelguniga qadar kuzatamiz.",
    exportStep1: "Vazifa bo‘yicha tanlov",
    exportStep1d: "Kerakli model, komplektatsiya va rangni mos bozordan izlaymiz.",
    exportStep2: "Tushunarli yo‘l",
    exportStep2d: "Yetkazib berish manbasini belgilaymiz va avtomobil statusini yangilab boramiz.",
    exportStep3: "Kalit topshirilgunga qadar",
    exportStep3d: "Logistikani kuzatamiz va avtomobil yetib kelguniga qadar mijozni xabardor qilamiz.",
    exportNote: "Mamlakat va yetkazib berish yo‘li tanlangan avtomobil, komplektatsiya va bozor shartlariga bog‘liq.",
    digitalKicker: "AUTO SALE UMAR EKOTIZIMI",
    digitalTitle: "Sayt va ilova bitta tizim sifatida ishlaydi.",
    digitalText: "Auto Sale Umar o‘zining raqamli ekotizimini rivojlantirmoqda: sayt, mobil interfeys, katalog va avtomobil kartalari yagona mantiqda ishlaydi. Bu mijoz uchun tanlov yo‘lini aniqroq, jamoa uchun esa ish jarayonini yaxlit qiladi.",
    digitalFeature1: "Yagona avtomobil bazasi",
    digitalFeature1d: "Katalog, statuslar, narxlar va avtomobil kartalari bitta raqamli kontur ichida ishlaydi.",
    digitalFeature2: "Sayt va mobil interfeys",
    digitalFeature2d: "Mijoz avtomobillarni ko‘rishi, katalogni filtrlashi va so‘rov yuborishi mumkin — qulay qurilmadan.",
    digitalFeature3: "Premium taqdimot",
    digitalFeature3d: "Ekotizim Auto Sale Umar’ning yagona uslubini ta’minlaydi — taqdimotdan aniq avtomobil tanlovigacha.",
    digitalPrimaryAction: "Katalogni ochish",
    digitalSecondaryAction: "So‘rov qoldirish",
    soldKicker: "O‘Z EGALARINI TOPGAN AVTOMOBILLAR",
    soldTitle: "Bu avtomobillar allaqachon sotilgan.",
    soldText: "Model yoki komplektatsiya yoqdimi? Siz uchun xuddi shunday avtomobilni topib, buyurtma asosida olib kelishimiz mumkin.",
    soldAction: "Xuddi shunday buyurtma qilish",
    soldStatus: "Sotilgan",
    contactsKicker: "KONTAKTLAR",
    contactsTitle: "Sizga qulay joyda davom etamiz.",
    contactsText: "Instagram asosiy avtomobil sharhlari kanali bo‘lib qoladi. Maslahat uchun yozish yoki qo‘ng‘iroq qilish mumkin.",
    instagram: "Instagram",
    telegram: "Telegram",
    whatsapp: "WhatsApp",
    call: "Qo‘ng‘iroq",
    itTeamTitle: "AutoSale Umar IT Team",
    itTeamFounder: "Asoschi — Abdulaziz.developer",
    itTeamSummary: "Auto Sale Umar uchun dasturlash, dizayn va raqamli yechimlar.",
    itTeamAction: "Sahifani ochish",
    footer: "Auto Sale Umar · Premium avtomobil shourumi · Toshkent",
    priceRequest: "Narx so‘rov bo‘yicha",
    showroomStatus: "Shourumda",
    inStockStatus: "Mavjud",
    transitStatus: "Yo‘lda",
    orderStatus: "Buyurtma",
    reserveStatus: "Rezerv",
    color: "Rang",
  },
} as const;

const YANDEX_MAPS_URL = "https://yandex.ru/maps/org/auto_sale_umar/98317002086?si=y1pjpr56py0hyc8ar2j2cw1t40";

function formatPrice(car: CatalogCar, language: Language): string {
  if (car.priceOnRequest || car.price == null) return COPY[language].priceRequest;
  const value = new Intl.NumberFormat(language === "ru" ? "ru-RU" : "uz-UZ", { maximumFractionDigits: 0 }).format(car.price);
  if (car.currency === "USD") return `${value} $`;
  if (car.currency === "EUR") return `${value} €`;
  return `${value} сум`;
}

function formatHeroPrice(video: HomeMediaItem, language: Language): string {
  if (video.priceOnRequest || video.price == null) return COPY[language].priceRequest;
  const value = new Intl.NumberFormat(language === "ru" ? "ru-RU" : "uz-UZ", { maximumFractionDigits: 0 }).format(video.price);
  if (video.currency === "USD") return `${value} $`;
  if (video.currency === "EUR") return `${value} €`;
  return `${value} сум`;
}

function statusLabel(status: CarStatus, language: Language): string {
  const c = COPY[language];
  if (status === "in_showroom") return c.showroomStatus;
  if (status === "in_stock") return c.inStockStatus;
  if (status === "in_transit") return c.transitStatus;
  if (status === "made_to_order") return c.orderStatus;
  if (status === "reserved") return c.reserveStatus;
  return "";
}

export default function HomeClient() {
  const [language, setLanguage] = useState<Language>("ru");
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [menuOpen, setMenuOpen] = useState(false);
  const [introVisible, setIntroVisible] = useState(true);
  const [muted, setMuted] = useState(true);
  const [cars, setCars] = useState<CatalogCar[]>([]);
  const [soldCars, setSoldCars] = useState<CatalogCar[]>([]);
  const [videos, setVideos] = useState<HomeMediaItem[]>([]);
  const [ramadanGift, setRamadanGift] = useState<RamadanGiftPayload | null>(null);
  const [brand, setBrand] = useState<string>("all");
  const [heroIndex, setHeroIndex] = useState(0);
  const heroRailRef = useRef<HTMLDivElement | null>(null);
  const marketRailRef = useRef<HTMLDivElement | null>(null);
  const marketPauseUntilRef = useRef(0);

  useEffect(() => {
    try {
      const storedLanguage = localStorage.getItem("asu-public-language");
      if (storedLanguage === "uz" || storedLanguage === "ru") setLanguage(storedLanguage);
      else if (navigator.language.toLowerCase().startsWith("uz")) setLanguage("uz");

      const storedTheme = localStorage.getItem("asu-public-theme");
      if (storedTheme === "system" || storedTheme === "light" || storedTheme === "dark") setThemeMode(storedTheme);
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
      let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "theme-color";
        document.head.appendChild(meta);
      }
      meta.content = color;
    };
    apply();
    if (themeMode === "system") media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [themeMode]);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/catalog?pageSize=100", { cache: "no-store", headers: { Accept: "application/json" } })
        .then((response) => response.json() as Promise<CatalogResponse>)
        .catch(() => null),
      fetch("/api/catalog?status=sold&pageSize=100", { cache: "no-store", headers: { Accept: "application/json" } })
        .then((response) => response.json() as Promise<CatalogResponse>)
        .catch(() => null),
      fetch("/api/home-media", { cache: "no-store", headers: { Accept: "application/json" } })
        .then((response) => response.json() as Promise<HomeMediaResponse>)
        .catch(() => null),
      fetch("/api/ramadan-gift", { cache: "no-store", headers: { Accept: "application/json" } })
        .then((response) => response.json() as Promise<RamadanGiftResponse>)
        .catch(() => null),
    ]).then(([catalog, soldCatalog, media, ramadan]) => {
      if (cancelled) return;
      if (catalog?.success && Array.isArray(catalog.cars)) setCars(catalog.cars);
      if (soldCatalog?.success && Array.isArray(soldCatalog.cars)) setSoldCars(soldCatalog.cars);
      if (media?.success && Array.isArray(media.videos)) setVideos(media.videos);
      if (ramadan?.success && ramadan.gift) setRamadanGift(ramadan.gift);
    });
    return () => { cancelled = true; };
  }, []);

  const c = COPY[language];
  const heroVideos = useMemo<HomeMediaItem[]>(() => [
    {
      key: "built-in-intro",
      url: "/intro.mp4",
      size: 0,
      uploadedAt: null,
      brand: "AUTO SALE UMAR",
      model: language === "ru" ? "Премиальный шоурум" : "Premium shourum",
      price: null,
      currency: "USD",
      priceOnRequest: true,
      status: "in_showroom",
    },
    ...videos,
  ], [videos, language]);

  const showroomCars = useMemo(() => cars.filter((car) =>
    car.status === "in_showroom" && (brand === "all" || car.brand === brand),
  ), [cars, brand]);

  const stockCars = useMemo(() => cars.filter((car) =>
    (car.status === "in_stock" || car.status === "in_showroom") && (brand === "all" || car.brand === brand),
  ), [cars, brand]);

  const transitCars = useMemo(() => cars.filter((car) =>
    (car.status === "in_transit" || car.status === "made_to_order") && (brand === "all" || car.brand === brand),
  ), [cars, brand]);

  const closeIntro = useCallback(() => setIntroVisible(false), []);

  useEffect(() => {
    if (!introVisible) return;
    const timer = window.setTimeout(closeIntro, 5200);
    return () => window.clearTimeout(timer);
  }, [introVisible, closeIntro]);

  useEffect(() => {
    const rail = marketRailRef.current;
    if (!rail) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const elapsed = Math.min(now - lastTime, 64);
      lastTime = now;

      if (Date.now() >= marketPauseUntilRef.current) {
        const firstGroup = rail.firstElementChild as HTMLElement | null;
        const loopWidth = firstGroup?.offsetWidth ?? 0;
        if (loopWidth > 0) {
          rail.scrollLeft += elapsed * 0.022;
          if (rail.scrollLeft >= loopWidth) rail.scrollLeft -= loopWidth;
        }
      }

      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [language]);

  const pauseMarketAutoScroll = useCallback(() => {
    marketPauseUntilRef.current = Number.POSITIVE_INFINITY;
  }, []);

  const resumeMarketAutoScroll = useCallback(() => {
    marketPauseUntilRef.current = Date.now() + 3200;
  }, []);

  function changeLanguage(next: Language) {
    setLanguage(next);
    try { localStorage.setItem("asu-public-language", next); } catch {}
  }

  function changeTheme(next: ThemeMode) {
    setThemeMode(next);
    try { localStorage.setItem("asu-public-theme", next); } catch {}
  }

  function goHero(index: number) {
    const safe = Math.max(0, Math.min(index, heroVideos.length - 1));
    setHeroIndex(safe);
    const rail = heroRailRef.current;
    if (rail) rail.scrollTo({ left: rail.clientWidth * safe, behavior: "smooth" });
  }

  function handleHeroScroll() {
    const rail = heroRailRef.current;
    if (!rail || rail.clientWidth <= 0) return;
    const next = Math.round(rail.scrollLeft / rail.clientWidth);
    if (next !== heroIndex) setHeroIndex(next);
  }



  const wordmark = resolvedTheme === "dark" ? "/brand/asu-wordmark-white.png" : "/brand/asu-wordmark-black.png";
  return (
    <main className={styles.page} data-theme={resolvedTheme}>
      {introVisible ? (
        <div className={styles.intro} aria-label="Auto Sale Umar intro">
          <video className={styles.introVideo} src="/intro.mp4" poster="/intro-poster.jpg" autoPlay muted playsInline preload="auto" onEnded={closeIntro} onError={closeIntro} />
          <div className={styles.introShade} />
          <img className={styles.introWordmark} src="/brand/asu-wordmark-white.png" alt="Auto Sale Umar" />
          <button className={styles.introSkip} type="button" onClick={closeIntro}>{c.skip}</button>
        </div>
      ) : null}

      <header className={styles.header}>
        <span className={styles.headerSpacer} aria-hidden="true" />
        <a className={styles.headerBrand} href="#top" aria-label="Auto Sale Umar">
          <img src={wordmark} alt="Auto Sale Umar" />
        </a>
        <button className={styles.circleButton} type="button" onClick={() => setMenuOpen((open) => !open)} aria-label={c.menu} aria-expanded={menuOpen}>
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>

      <button className={styles.menuBackdrop} data-open={menuOpen} type="button" onClick={() => setMenuOpen(false)} aria-label={c.close} />
      <aside className={styles.menuPanel} data-open={menuOpen} aria-hidden={!menuOpen}>
        <nav className={styles.menuNav}>
          <a href="#stock" onClick={() => setMenuOpen(false)}><CarFront /><span>{c.cars}</span><ChevronRight /></a>
          <a href="#showroom" onClick={() => setMenuOpen(false)}><MapPin /><span>{c.showroomMenu}</span><ChevronRight /></a>
          <a href="#contacts" onClick={() => setMenuOpen(false)}><MessageCircle /><span>{c.contacts}</span><ChevronRight /></a>
          <a href="/admin/login/" onClick={() => setMenuOpen(false)}><Users /><span>{c.employees}</span><ChevronRight /></a>
        </nav>

        <div className={styles.menuControls}>
          <div className={styles.menuControlGroup}>
            <span>{c.language}</span>
            <div className={styles.segmented}>
              <button type="button" data-active={language === "ru"} onClick={() => changeLanguage("ru")}>RU</button>
              <button type="button" data-active={language === "uz"} onClick={() => changeLanguage("uz")}>UZ</button>
            </div>
          </div>
          <div className={styles.menuControlGroup}>
            <span>{c.theme}</span>
            <div className={styles.themeSegmented}>
              <button type="button" data-active={themeMode === "system"} onClick={() => changeTheme("system")} aria-label={c.system}><Monitor /><b>{c.system}</b></button>
              <button type="button" data-active={themeMode === "light"} onClick={() => changeTheme("light")} aria-label={c.light}><Sun /><b>{c.light}</b></button>
              <button type="button" data-active={themeMode === "dark"} onClick={() => changeTheme("dark")} aria-label={c.dark}><Moon /><b>{c.dark}</b></button>
            </div>
          </div>
        </div>
      </aside>

      <section className={styles.hero} id="top">
        <div className={styles.heroRail} ref={heroRailRef} onScroll={handleHeroScroll}>
          {heroVideos.map((video, index) => (
            <article className={styles.heroSlide} key={video.key}>
              <div className={styles.heroVideoFrame}>
                <HeroVideo src={video.url} poster={index === 0 ? "/intro-poster.jpg" : undefined} active={index === heroIndex && !introVisible} muted={muted} near={Math.abs(index - heroIndex) <= 1} loop={heroVideos.length === 1} onEnded={heroVideos.length > 1 ? () => goHero((index + 1) % heroVideos.length) : undefined} />
                {index === heroIndex ? (
                  <>
                    <button className={styles.soundButton} type="button" onClick={() => setMuted((value) => !value)} aria-label={muted ? "Sound on" : "Sound off"}>
                      {muted ? <VolumeX /> : <Volume2 />}
                    </button>
                    {heroVideos.length > 1 ? (
                      <div className={styles.heroDots} aria-label="Hero videos">
                        {heroVideos.map((item, dotIndex) => <button key={item.key} type="button" data-active={dotIndex === heroIndex} onClick={() => goHero(dotIndex)} aria-label={`Video ${dotIndex + 1}`} />)}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
              <div className={styles.heroCaption}>
                <div className={styles.heroCaptionMain}>
                  <span>{video.brand || "AUTO SALE UMAR"}</span>
                  <strong>{video.model || (language === "ru" ? "Автомобиль" : "Avtomobil")}</strong>
                </div>
                <div className={styles.heroCaptionMeta}>
                  <b>{formatHeroPrice(video, language)}</b>
                  <i>{statusLabel(video.status, language)}</i>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} id="cars">
        <SectionHeading kicker={c.brandsKicker} title={c.brandsTitle} text={c.brandsText} />
        <div className={styles.brandRail}>
          <button className={styles.brandCard} type="button" data-active={brand === "all"} onClick={() => setBrand("all")}>
            <span className={styles.allBrands}><Sparkles /></span><b>{language === "ru" ? "Все" : "Barchasi"}</b>
          </button>
          {BRANDS.map((item) => (
            <button className={styles.brandCard} type="button" key={item.name} data-active={brand === item.name} onClick={() => setBrand(item.name)}>
              <span><img src={item.logo} alt="" /></span><b>{item.name}</b>
            </button>
          ))}
        </div>
      </section>

      <InventorySection id="showroom-cars" kicker={c.showroomCarsKicker} title={c.showroomCarsTitle} text={c.showroomCarsText} empty={c.emptyShowroom} cars={showroomCars} language={language} requestBrand={brand} catalogStatus="in_showroom" />
      <InventorySection id="stock" kicker={c.stockKicker} title={c.stockTitle} text={c.stockText} empty={c.emptyStock} cars={stockCars} language={language} requestBrand={brand} catalogStatus="available" />
      {ramadanGift?.isActive ? <RamadanGiftSection gift={ramadanGift} language={language} /> : null}
      <InventorySection id="transit" kicker={c.transitKicker} title={c.transitTitle} text={c.transitText} empty={c.emptyTransit} cars={transitCars} language={language} requestBrand={brand} catalogStatus="in_transit" />

      <section className={`${styles.section} ${styles.comparePromoSection}`} id="compare">
        <div className={styles.comparePromoRail}>
          <article className={`${styles.comparePromoCard} ${styles.comparePromoSlide}`}>
            <div className={styles.comparePromoCopy}>
              <span><ArrowLeftRight />{c.compareKicker}</span>
              <h2>{c.compareTitle}</h2>
              <p>{c.compareText}</p>
              <a href="/compare/">{c.compareAction}<ChevronRight /></a>
            </div>
            <div className={styles.comparePromoVisual} aria-hidden="true">
              <div className={styles.compareSlot}>
                <small>01</small>
                <strong>AUTO</strong>
                <span>{language === "ru" ? "Ваш выбор" : "Sizning tanlovingiz"}</span>
              </div>
              <div className={styles.compareSwap}><ArrowLeftRight /></div>
              <div className={styles.compareSlot}>
                <small>02</small>
                <strong>AUTO</strong>
                <span>{language === "ru" ? "Альтернатива" : "Alternativa"}</span>
              </div>
              <div className={styles.compareAiBadge}><Sparkles /><span>{c.compareAI}</span></div>
            </div>
          </article>

          <article className={`${styles.smartConsultantCard} ${styles.comparePromoSlide}`}>
            <div className={styles.smartConsultantGlow} aria-hidden="true" />
            <div className={styles.smartConsultantCopy}>
              <span><Sparkles />{language === "ru" ? "ПЕРСОНАЛЬНАЯ КОНСУЛЬТАЦИЯ" : "SHAXSIY MASLAHAT"}</span>
              <h2>AUTO SALE UMAR<br />SMART-КОНСУЛЬТАНТ</h2>
              <p>{language === "ru"
                ? "Совет перед выбором автомобиля. Укажите модели и то, что для вас важно — консультант сопоставит характеристики и комплектации."
                : "Avtomobil tanlashdan oldin maslahat. Modellarni va muhim mezonlarni tanlang — maslahatchi xususiyatlar va komplektatsiyalarni solishtiradi."}</p>
              <a href="/compare/">{language === "ru" ? "Получить совет" : "Maslahat olish"}<ChevronRight /></a>
            </div>
            <div className={styles.smartConsultantVisual} aria-hidden="true">
              <div className={styles.smartOrb}><Sparkles /></div>
              <span>01</span>
              <span>02</span>
              <i />
            </div>
          </article>
        </div>
      </section>

      <section className={`${styles.section} ${styles.showroomSection}`} id="showroom">
        <SectionHeading kicker={c.showroomKicker} title={c.showroomTitle} text={c.showroomText} />
        <div className={styles.showroomRail}>
          {SHOWROOM_STORIES.map((story, index) => (
            <article className={styles.showroomStory} key={story.image}>
              <div className={styles.showroomImageWrap}>
                <img src={story.image} alt="Auto Sale Umar showroom" loading={index < 2 ? "eager" : "lazy"} />
              </div>
              <div className={styles.showroomStoryCopy}>
                <h3>{language === "ru" ? story.ruTitle : story.uzTitle}</h3>
                <p>{language === "ru" ? story.ruText : story.uzText}</p>
              </div>
            </article>
          ))}
        </div>
        <div className={styles.showroomActions}>
          <div className={styles.showroomBookingCopy}>
            <p className={styles.kicker}>{c.locationKicker}</p>
            <strong>{c.bookVisit}</strong>
            <span>{c.bookVisitText}</span>
          </div>
          <div className={styles.showroomActionButtons}>
            <a className={styles.bookingPill} href="/booking/"><CalendarDays />{c.bookVisit}<ChevronRight /></a>
            <a className={styles.showroomRoutePill} href={YANDEX_MAPS_URL} target="_blank" rel="noreferrer"><MapPin />{c.route}<ArrowUpRight /></a>
          </div>
        </div>
      </section>

      <section className={styles.section} id="delivery">
        <div className={styles.exportCard}>
          <div className={styles.exportHeading}>
            <p className={styles.kicker}>{c.exportKicker}</p>
            <h2>{c.exportTitle}</h2>
            <p>{c.exportText}</p>
          </div>
          <div className={styles.worldMapStage}>
            <img src="/homepage/world-map.webp" alt="" aria-hidden="true" />
          </div>
          <div className={styles.exportWorkflow}>
            <div><span>01</span><strong>{c.exportStep1}</strong><p>{c.exportStep1d}</p></div>
            <div><span>02</span><strong>{c.exportStep2}</strong><p>{c.exportStep2d}</p></div>
            <div><span>03</span><strong>{c.exportStep3}</strong><p>{c.exportStep3d}</p></div>
          </div>
          <div
            className={styles.marketRail}
            ref={marketRailRef}
            onPointerDown={pauseMarketAutoScroll}
            onPointerUp={resumeMarketAutoScroll}
            onPointerCancel={resumeMarketAutoScroll}
            onPointerLeave={resumeMarketAutoScroll}
          >
            <div className={styles.marketLoopGroup}>
              {MARKETS.map((market) => <div className={styles.marketPill} key={`primary-${market.ru}`}><span>{market.flag}</span><b>{market[language]}</b></div>)}
            </div>
            <div className={styles.marketLoopGroup} aria-hidden="true">
              {MARKETS.map((market) => <div className={styles.marketPill} key={`loop-${market.ru}`}><span>{market.flag}</span><b>{market[language]}</b></div>)}
            </div>
          </div>
          <p className={styles.exportNote}><Ship />{c.exportNote}</p>
        </div>
      </section>

      <SoldCarsSection cars={soldCars} language={language} />

      <DigitalExperienceSection language={language} />

      <section className={`${styles.section} ${styles.contactsSection}`} id="contacts">
        <SectionHeading kicker={c.contactsKicker} title={c.contactsTitle} text={c.contactsText} />
        <div className={styles.contactGrid}>
          <ContactCard href="https://www.instagram.com/auto_sale_umar/" icon={<Instagram />} label={c.instagram} detail="@auto_sale_umar" />
          <ContactCard href="https://t.me/auto_sale_umar777" icon={<MessageCircle />} label={c.telegram} detail="auto_sale_umar777" />
          <ContactCard href="https://wa.me/998771155553" icon={<MessageCircle />} label={c.whatsapp} detail="+998 77 115 55 53" />
          <ContactCard href="tel:+998771155553" icon={<Phone />} label={c.call} detail="+998 77 115 55 53" />
        </div>
      </section>

      <section className={`${styles.section} ${styles.legacySection}`} aria-label={c.trust25Title}>
        <a className={styles.legacyCard} href="/trust/">
          <div className={styles.legacyGlow} aria-hidden="true" />
          <div className={styles.legacyNumber} aria-hidden="true">25</div>
          <div className={styles.legacyCopy}>
            <span>{c.trust25Kicker}</span>
            <h2>{c.trust25Title}</h2>
            <p>{c.trust25Text}</p>
            <strong>{c.trust25Action}<ChevronRight /></strong>
          </div>
          <div className={styles.legacyMark}>
            <img src="/brand/asu-wordmark-white.png" alt="" aria-hidden="true" />
            <small>25 YEARS · EXPERIENCE</small>
          </div>
        </a>
      </section>

      <section className={styles.closingImageSection} aria-label="Auto Sale Umar">
        <img src="/homepage/bentley-closing.jpeg" alt="Auto Sale Umar · Bentley" loading="lazy" />
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <img src={wordmark} alt="Auto Sale Umar" />
          <p className={styles.footerPremium}>{language === "ru"
            ? "Премиальные автомобили. Точный выбор. Персональное сопровождение."
            : "Premium avtomobillar. Aniq tanlov. Shaxsiy kuzatuv."}</p>
        </div>
        <small>Auto Sale Umar 2026 · All rights reserved.</small>
      </footer>

      <section className={`${styles.section} ${styles.developerMiniSection}`} aria-label="AutoSale Umar IT Team">
        <a className={styles.developerMiniCard} href="/it-team/">
          <div className={styles.developerMiniAvatarWrap}>
            <img src="/homepage/abdulaziz-developer.jpg" alt="Abdulaziz.developer" className={styles.developerMiniAvatar} loading="lazy" />
          </div>
          <div className={styles.developerMiniCopy}>
            <span>IT TEAM</span>
            <h3>{c.itTeamTitle}</h3>
            <p>{c.itTeamFounder}</p>
            <small>{c.itTeamSummary}</small>
          </div>
          <div className={styles.developerMiniArrow}>
            <ChevronRight />
          </div>
        </a>
      </section>
    </main>
  );
}

function getSoldCarPhotos(car: CatalogCar): string[] {
  const urls = [
    car.coverUrl,
    ...(car.variants?.flatMap((variant) => variant.photos.map((photo) => photo.url)) ?? []),
  ].filter((url): url is string => Boolean(url));
  return Array.from(new Set(urls)).slice(0, 8);
}

function SoldCarCard({ car, language }: { car: CatalogCar; language: Language }) {
  const c = COPY[language];
  const photos = getSoldCarPhotos(car);
  const href = `/car/?slug=${encodeURIComponent(car.slug)}`;
  const mediaRef = useRef<HTMLDivElement | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);

  function updateActivePhoto() {
    const rail = mediaRef.current;
    if (!rail || rail.clientWidth <= 0) return;
    const nextIndex = Math.round(rail.scrollLeft / rail.clientWidth);
    setActivePhoto(Math.max(0, Math.min(photos.length - 1, nextIndex)));
  }

  return (
    <a className={styles.soldCard} href={href} aria-label={`${c.soldAction}: ${car.brand} ${car.model}`}>
      <div className={styles.soldCardMedia}>
        {photos.length ? (
          <div
            ref={mediaRef}
            className={styles.soldCardMediaRail}
            onScroll={updateActivePhoto}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerMove={(event) => event.stopPropagation()}
          >
            {photos.map((url, index) => (
              <div className={styles.soldCardMediaSlide} key={`${url}-${index}`}>
                <img src={url} alt={`${car.brand} ${car.model}`} loading="lazy" />
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.soldCardPlaceholder}><CarFront /></div>
        )}
        <span className={styles.soldStatusPill}>{c.soldStatus}</span>
        {photos.length > 1 ? (
          <div className={styles.soldPhotoDots} aria-hidden="true">
            {photos.map((_, index) => <i key={index} data-active={index === activePhoto} />)}
          </div>
        ) : null}
      </div>
      <div className={styles.soldCardBody}>
        <div className={styles.soldCardMeta}>
          <span>{car.brand}</span>
          {car.year ? <span>{car.year}</span> : null}
        </div>
        <h3>{car.model}</h3>
        {car.trim ? <p>{car.trim}</p> : null}
        <span className={styles.soldCardAction}>{c.soldAction}<ChevronRight /></span>
      </div>
    </a>
  );
}

function SoldCarsSection({ cars, language }: { cars: CatalogCar[]; language: Language }) {
  const c = COPY[language];
  if (!cars.length) return null;

  return (
    <section className={`${styles.section} ${styles.soldSection}`} id="sold-cars">
      <SectionHeading kicker={c.soldKicker} title={c.soldTitle} text={c.soldText} />
      <div className={styles.soldRail}>
        {cars.slice(0, 10).map((car) => <SoldCarCard car={car} language={language} key={car.id} />)}
      </div>
    </section>
  );
}

function DigitalExperienceSection({ language }: { language: Language }) {
  const c = COPY[language];
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement | null>(null);

  function updateActiveDigitalCard() {
    const rail = carouselRef.current;
    if (!rail) return;
    const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
    if (maxScroll <= 0) {
      setActiveIndex(0);
      return;
    }
    const progress = Math.max(0, Math.min(1, rail.scrollLeft / maxScroll));
    setActiveIndex(Math.round(progress * (DIGITAL_EXPERIENCE_MEDIA.length - 1)));
  }

  function selectDigitalCard(index: number) {
    const rail = carouselRef.current;
    const card = rail?.children.item(index) as HTMLElement | null;
    if (!rail || !card) return;
    const paddingLeft = Number.parseFloat(window.getComputedStyle(rail).paddingLeft || "0") || 0;
    rail.scrollTo({ left: Math.max(0, card.offsetLeft - paddingLeft), behavior: "smooth" });
    setActiveIndex(index);
  }

  return (
    <section className={`${styles.section} ${styles.digitalSection}`} id="ecosystem">
      <div className={styles.digitalExperienceCard}>
        <div className={styles.digitalExperienceCopy}>
          <p className={styles.kicker}>{c.digitalKicker}</p>
          <h2>{c.digitalTitle}</h2>
          <p className={styles.digitalExperienceText}>{c.digitalText}</p>

          <div className={styles.digitalExperiencePills}>
            <span>{language === "ru" ? "Сайт" : "Sayt"}</span>
            <span>{language === "ru" ? "Приложение" : "Ilova"}</span>
            <span>{language === "ru" ? "Единая система" : "Yagona tizim"}</span>
          </div>
        </div>

        <div className={styles.digitalCarousel} ref={carouselRef} onScroll={updateActiveDigitalCard}>
          {DIGITAL_EXPERIENCE_MEDIA.map((item) => (
            <figure className={styles.digitalCarouselCard} key={item.image}>
              <div className={styles.digitalCarouselImage}>
                <img src={item.image} alt={language === "ru" ? item.ruTitle : item.uzTitle} loading="lazy" />
              </div>
              <figcaption>
                <strong>{language === "ru" ? item.ruTitle : item.uzTitle}</strong>
                <span>{language === "ru" ? item.ruText : item.uzText}</span>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className={styles.digitalCarouselDots} aria-label={language === "ru" ? "Карточки экосистемы" : "Ekotizim kartalari"}>
          {DIGITAL_EXPERIENCE_MEDIA.map((item, index) => (
            <button
              type="button"
              key={item.image}
              data-active={activeIndex === index}
              aria-label={language === "ru" ? `Карточка ${index + 1}` : `${index + 1}-karta`}
              onClick={() => selectDigitalCard(index)}
            />
          ))}
        </div>

        <div className={styles.digitalExperienceActions}>
          <a className={styles.digitalPrimaryAction} href="/cars/">{c.digitalPrimaryAction}<ChevronRight /></a>
          <a className={styles.digitalSecondaryAction} href="/request-car/">{c.digitalSecondaryAction}</a>
        </div>
      </div>
    </section>
  );
}

function RamadanGiftSection({ gift, language }: { gift: RamadanGiftPayload; language: Language }) {
  const c = COPY[language];
  const cover = gift.media.find((item) => item.isCover) ?? gift.media[0] ?? null;

  return (
    <section className={`${styles.section} ${styles.ramadanSection}`} id="ramadan-gift">
      <a className={styles.ramadanFeature} href="/ramadan-gift/">
        <div className={styles.ramadanFeatureBackdrop} />
        <div className={styles.ramadanFeatureCopy}>
          <p className={styles.ramadanFeatureEyebrow}>{c.ramadanGiftKicker}</p>
          <h2>{c.ramadanGiftTitle}</h2>
          <p className={styles.ramadanFeatureText}>{c.ramadanGiftText}</p>

          <div className={styles.ramadanFeatureIdentity}>
            <strong>{language === "ru" ? gift.subtitleRu : gift.subtitleUz}</strong>
            <span>{language === "ru" ? gift.shortPhraseRu : gift.shortPhraseUz}</span>
          </div>

          <div className={styles.ramadanFeatureFooter}>
            <span className={styles.ramadanFeatureModel}>{gift.subtitleRu}</span>
            <span className={styles.ramadanFeatureAction}>{c.ramadanGiftAction}<ChevronRight /></span>
          </div>
        </div>

        <div className={styles.ramadanFeatureVisual}>
          <div className={styles.ramadanFeatureHalo} />
          {cover ? <img src={cover.publicUrl} alt={language === "ru" ? gift.subtitleRu : gift.subtitleUz} loading="lazy" /> : null}
        </div>
      </a>
    </section>
  );
}

function HeroVideo({ src, poster, active, muted, near, loop, onEnded }: { src: string; poster?: string; active: boolean; muted: boolean; near: boolean; loop: boolean; onEnded?: () => void }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = muted;
    if (active) void video.play().catch(() => undefined);
    else video.pause();
  }, [active, muted, src]);
  return <video ref={ref} src={src} poster={poster} muted={muted} playsInline loop={loop} onEnded={onEnded} preload={near ? "metadata" : "none"} />;
}

function SectionHeading({ kicker, title, text }: { kicker: string; title: string; text?: string }) {
  return <div className={styles.sectionHeading}><p className={styles.kicker}>{kicker}</p><h2>{title}</h2>{text ? <p>{text}</p> : null}</div>;
}

function InventorySection({ id, kicker, title, text, empty, cars, language, requestBrand, catalogStatus }: { id: string; kicker: string; title: string; text: string; empty: string; cars: CatalogCar[]; language: Language; requestBrand: string; catalogStatus: string }) {
  const visibleCars = cars.slice(0, 6);
  const c = COPY[language];
  const requestHref = requestBrand !== "all" ? `/request-car/?brand=${encodeURIComponent(requestBrand)}` : "/request-car/";
  const catalogParams = new URLSearchParams();
  if (requestBrand !== "all") catalogParams.set("brand", requestBrand);
  if (catalogStatus) catalogParams.set("status", catalogStatus);
  const catalogHref = `/cars/${catalogParams.toString() ? `?${catalogParams.toString()}` : ""}`;
  return (
    <section className={styles.section} id={id}>
      <SectionHeading kicker={kicker} title={title} text={text} />
      {visibleCars.length ? (
        <>
          <div className={styles.carGrid}>{visibleCars.map((car) => <PublicCarCard key={car.id} car={car} language={language} />)}</div>
          {cars.length > 6 ? <a className={styles.seeAllPill} href={catalogHref}>{c.seeAll}<ChevronRight /></a> : null}
        </>
      ) : (
        <div className={styles.requestCard}>
          <div className={styles.requestIcon}><Search /></div>
          <div className={styles.requestCopy}>
            <span>{c.requestKicker}</span>
            <h3>{c.requestTitle}</h3>
            <p>{empty} {c.requestText}</p>
          </div>
          <a className={styles.requestButton} href={requestHref}>{c.requestAction}<ChevronRight /></a>
        </div>
      )}
    </section>
  );
}

function PublicCarCard({ car, language }: { car: CatalogCar; language: Language }) {
  const variants = car.variants ?? [];
  const [variantIndex, setVariantIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const mediaRef = useRef<HTMLDivElement | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const pointerMovedRef = useRef(false);
  const safeVariantIndex = Math.min(variantIndex, Math.max(variants.length - 1, 0));
  const activeVariant = variants[safeVariantIndex] ?? null;
  const photos = activeVariant?.photos?.length
    ? activeVariant.photos
    : car.coverUrl
      ? [{ id: -1, url: car.coverUrl, isCover: true, sortOrder: 0 }]
      : [];
  const sharePhotoUrl = photos[0]?.url ?? car.coverUrl;

  useEffect(() => {
    warmShareImage(sharePhotoUrl, `${car.brand} ${car.model}`);
  }, [car.brand, car.model, sharePhotoUrl]);

  function selectVariant(index: number) {
    setVariantIndex(index);
    setPhotoIndex(0);
    mediaRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  }

  function handlePhotoScroll() {
    const rail = mediaRef.current;
    if (!rail || rail.clientWidth <= 0) return;
    const next = Math.round(rail.scrollLeft / rail.clientWidth);
    if (next !== photoIndex) setPhotoIndex(next);
  }

  function openCar() {
    window.location.href = `/car/?slug=${encodeURIComponent(car.slug)}`;
  }

  async function shareCurrentCar() {
    await shareCar({
      slug: car.slug,
      brand: car.brand,
      model: car.model,
      imageUrl: photos[0]?.url ?? car.coverUrl,
    });
  }

  return (
    <article
      className={styles.carCard}
      role="link"
      tabIndex={0}
      aria-label={`${car.brand} ${car.model}`}
      onPointerDown={(event) => {
        pointerStartRef.current = { x: event.clientX, y: event.clientY };
        pointerMovedRef.current = false;
      }}
      onPointerMove={(event) => {
        const start = pointerStartRef.current;
        if (!start) return;
        if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) pointerMovedRef.current = true;
      }}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (pointerMovedRef.current) { pointerMovedRef.current = false; return; }
        if (target.closest("button, a")) return;
        openCar();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target === event.currentTarget) openCar();
      }}
    >
      <div className={styles.carMediaShell}>
        <div className={styles.carMediaRail} ref={mediaRef} onScroll={handlePhotoScroll}>
          {photos.length ? photos.map((photo) => (
            <div className={styles.carMediaSlide} key={`${activeVariant?.id ?? "fallback"}-${photo.id}`}>
              <img src={photo.url} alt={`${car.brand} ${car.model}`} loading="lazy" />
            </div>
          )) : <div className={styles.carPlaceholder}><CarFront /></div>}
        </div>
        <span className={styles.statusPill} data-status={car.status}>{statusLabel(car.status, language)}</span>
        <button
          className={styles.cardShareButton}
          type="button"
          aria-label={language === "ru" ? `Поделиться ${car.brand} ${car.model}` : `${car.brand} ${car.model} ulashish`}
          onClick={(event) => {
            event.stopPropagation();
            void shareCurrentCar();
          }}
        >
          <Share2 aria-hidden="true" />
        </button>
        {photos.length > 1 ? (
          <div className={styles.photoDots}>{photos.map((photo, index) => <i key={photo.id} data-active={index === photoIndex} />)}</div>
        ) : null}
      </div>

      <div className={styles.carInfo}>
        <div className={styles.carMeta}><span>{car.brand}</span>{car.year ? <b>{car.year}</b> : null}</div>
        <h3>{car.model}</h3>
        {car.trim ? <p>{car.trim}</p> : null}
        {car.engineText ? <span className={styles.engineTag}>{car.engineText}</span> : null}

        {variants.length ? (
          <div className={styles.colorSelector}>
            <div className={styles.colorDots}>
              {variants.map((variant, index) => (
                <button key={variant.id} type="button" data-active={index === safeVariantIndex} onClick={() => selectVariant(index)} aria-label={variant.exteriorColorName || `${COPY[language].color} ${index + 1}`}>
                  <span style={{ backgroundColor: variant.exteriorSwatch || "#111214" }} />
                </button>
              ))}
            </div>
            <p>{activeVariant?.exteriorColorName || ""}</p>
          </div>
        ) : null}

        <div className={styles.carPrice}><span>{language === "ru" ? "Цена" : "Narx"}</span><b>{formatPrice(car, language)}</b></div>
      </div>
    </article>
  );
}


function ContactCard({ href, icon, label, detail }: { href: string; icon: ReactNode; label: string; detail: string }) {
  return <a className={styles.contactCard} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined}><span>{icon}</span><div><b>{label}</b><small>{detail}</small></div><ArrowUpRight /></a>;
}
