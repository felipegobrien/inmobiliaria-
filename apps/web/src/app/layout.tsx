import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { FavoritesProvider } from "@/lib/favorites";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { SITE_URL } from "@/lib/supabase-server";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Ercada — Encuentra tu próximo hogar en Colombia",
    template: "%s | Ercada",
  },
  description:
    "Portal inmobiliario: compra, vende y arrienda apartamentos, casas y más en toda Colombia.",
  applicationName: "Ercada",
  openGraph: {
    type: "website",
    siteName: "Ercada",
    locale: "es_CO",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport: Viewport = {
  themeColor: "#047857",
};

// Datos estructurados globales (schema.org) para Google.
const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Ercada",
  url: SITE_URL,
  logo: `${SITE_URL}/opengraph-image`,
};

const siteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Ercada",
  url: SITE_URL,
  inLanguage: "es-CO",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/venta/{search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        <AuthProvider>
          <FavoritesProvider>{children}</FavoritesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
