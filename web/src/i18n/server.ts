import "server-only";
import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { getDictionary } from ".";
import { LOCALES, isLocale, type Locale } from "./config";

export const localeStaticParams = () => LOCALES.map((l) => ({ lang: l }));

/**
 * Reads the `[lang]` root param (static, so pages stay prerenderable) and loads its dictionary.
 * Unknown locales render the 404 page.
 */
export async function resolveLocale() {
  const value = await lang();
  if (!isLocale(value)) notFound();
  const locale: Locale = value;
  return { locale, dict: getDictionary(locale) };
}
