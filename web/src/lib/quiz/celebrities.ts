import type { LocalizedText } from "./types";

export interface Celebrity {
  id: string;
  name: LocalizedText;
  /** Who they are, in two or three words. */
  role: LocalizedText;
  /** Popular estimate, not a measured score. Shown with a disclaimer in the UI. */
  iq: number;
}

/** Sorted by IQ ascending. Photos live in public/portraits/<id>.webp (credits: docs/05-photo-credits.md). */
export const CELEBRITIES: Celebrity[] = [
  { id: "ali", name: { ru: "Мохаммед Али", en: "Muhammad Ali" }, role: { ru: "боксёр, чемпион мира", en: "boxer, world champion" }, iq: 78 },
  { id: "warhol", name: { ru: "Энди Уорхол", en: "Andy Warhol" }, role: { ru: "художник, поп-арт", en: "pop-art artist" }, iq: 86 },
  { id: "kennedy", name: { ru: "Джон Кеннеди", en: "John F. Kennedy" }, role: { ru: "35-й президент США", en: "35th US president" }, iq: 119 },
  { id: "washington", name: { ru: "Джордж Вашингтон", en: "George Washington" }, role: { ru: "1-й президент США", en: "1st US president" }, iq: 125 },
  { id: "lincoln", name: { ru: "Авраам Линкольн", en: "Abraham Lincoln" }, role: { ru: "16-й президент США", en: "16th US president" }, iq: 128 },
  { id: "clinton", name: { ru: "Билл Клинтон", en: "Bill Clinton" }, role: { ru: "42-й президент США", en: "42nd US president" }, iq: 137 },
  { id: "napoleon", name: { ru: "Наполеон Бонапарт", en: "Napoleon Bonaparte" }, role: { ru: "император Франции", en: "emperor of France" }, iq: 145 },
  { id: "hawking", name: { ru: "Стивен Хокинг", en: "Stephen Hawking" }, role: { ru: "физик-теоретик", en: "theoretical physicist" }, iq: 160 },
];

export const CELEBRITIES_BY_ID = new Map(CELEBRITIES.map((c) => [c.id, c]));

/** Closest celebrity at or below the score and closest strictly above it. */
export function bracketCelebrities(iq: number): { below: string | null; above: string | null } {
  const below = [...CELEBRITIES].reverse().find((c) => c.iq <= iq) ?? null;
  const above = CELEBRITIES.find((c) => c.iq > iq) ?? null;
  return { below: below?.id ?? null, above: above?.id ?? null };
}
