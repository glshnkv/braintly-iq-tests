import type { Locale } from "@/i18n/config";

/** Replaces {key} placeholders. Unknown keys are left as-is so missing data is visible, not silent. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

const INTL_LOCALE: Record<Locale, string> = { ru: "ru-RU", en: "en-US" };

export function formatMoney(minor: number, currency: string, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "currency",
    currency,
    minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100);
}

export function formatDate(date: Date | string, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { day: "numeric", month: "long" }).format(new Date(date));
}

/** Picks a plural form; `other` is the fallback for categories a language doesn't define. */
export function plural(locale: Locale, n: number, forms: { one: string; other: string; few?: string; many?: string }): string {
  const category = new Intl.PluralRules(INTL_LOCALE[locale]).select(n) as keyof typeof forms;
  return forms[category] ?? forms.other;
}

export function formatNumber(n: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale]).format(n);
}

export function countryName(code: string | null, locale: Locale): string | null {
  if (!code) return null;
  try {
    return new Intl.DisplayNames([INTL_LOCALE[locale]], { type: "region" }).of(code.toUpperCase()) ?? null;
  } catch {
    return null;
  }
}
