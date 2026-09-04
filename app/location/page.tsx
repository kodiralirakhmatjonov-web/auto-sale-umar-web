import type { Metadata } from "next";
import { SEO } from "../seo-config";
import LocationClient from "./location-client";

const YANDEX_MAPS_URL = "https://yandex.ru/maps/org/auto_sale_umar/98317002086?si=y1pjpr56py0hyc8ar2j2cw1t40";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: { absolute: "Локация шоурума Auto Sale Umar в Ташкенте" },
  description:
    "Локация шоурума Auto Sale Umar в Ташкенте. Откройте маршрут в Яндекс Картах, посмотрите автомобили и забронируйте персональный визит.",
  alternates: { canonical: `${SEO.siteUrl}/location/` },
  openGraph: {
    title: "Локация шоурума Auto Sale Umar",
    description: "Шоурум Auto Sale Umar в Ташкенте — маршрут, автомобили и запись на персональный визит.",
    url: `${SEO.siteUrl}/location/`,
    type: "website",
  },
};

const locationJsonLd = {
  "@context": "https://schema.org",
  "@type": "AutoDealer",
  name: "Auto Sale Umar",
  url: `${SEO.siteUrl}/`,
  hasMap: YANDEX_MAPS_URL,
  telephone: "+998771155553",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Tashkent",
    addressCountry: "UZ",
  },
};

export default function LocationPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(locationJsonLd) }}
      />
      <LocationClient />
    </>
  );
}
