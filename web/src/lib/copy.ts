import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { Cohort } from "./api-types";
import { countryName, fmt } from "./format";
import { CELEBRITIES_BY_ID } from "./quiz/celebrities";
import type { Achievement } from "./quiz/result-types";

/** Fills a cohort template like "Among {gender} aged {age}{country}…". */
export function cohortText(template: string, cohort: Cohort, dict: Dictionary, locale: Locale, extra: Record<string, string | number> = {}) {
  const country = countryName(cohort.country, locale);
  return fmt(template, {
    gender: dict.gendersPlural[cohort.gender ?? "any"],
    age: (cohort.ageGroup ?? "").replace("-", "–"),
    country: country ? fmt(dict.common.countrySuffix, { country }) : "",
    ...extra,
  });
}

export function achievementText(a: Achievement, dict: Dictionary): string {
  switch (a.type) {
    case "rare":
      return fmt(dict.paywall.achRare, { n: a.questionNumber, wrong: 100 - a.pctCorrect });
    case "fast":
      return fmt(dict.paywall.achFast, { n: a.questionNumber, s: a.seconds });
    case "streak":
      return fmt(dict.paywall.achStreak, { n: a.length });
  }
}

export function celebrity(id: string | null, locale: Locale) {
  const c = id ? CELEBRITIES_BY_ID.get(id) : undefined;
  return c ? { name: c.name[locale], iq: c.iq } : null;
}
