import type { Metadata, Viewport } from "next";
import { Caveat, IBM_Plex_Mono, Manrope } from "next/font/google";
import { localeStaticParams, resolveLocale } from "@/i18n/server";
import "../globals.css";

/** Manrope: geometric grotesk with full Cyrillic. Caveat: a single hand-written note. */
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin", "cyrillic"] });
/** Mono for small technical labels ("QUESTION 01"). */
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin", "cyrillic"], weight: ["500"] });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin", "cyrillic"], weight: ["600", "700"] });

export const generateStaticParams = localeStaticParams;

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await resolveLocale();
  return { title: dict.meta.title, description: dict.meta.description };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const { locale } = await resolveLocale();
  return (
    <html lang={locale} className={`${manrope.variable} ${plexMono.variable} ${caveat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
