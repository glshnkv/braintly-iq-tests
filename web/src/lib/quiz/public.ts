import "server-only";
import type { Locale } from "@/i18n/config";
import { QUESTIONS } from "./questions";
import type { LocalizedText, PublicContent, PublicOption, PublicQuestion, Question } from "./types";

const localize = (value: string | LocalizedText, locale: Locale) =>
  typeof value === "string" ? value : value[locale];

function toPublicContent(q: Question, locale: Locale): PublicContent {
  const c = q.content;
  switch (c.kind) {
    case "memory":
      return { ...c, prompt: c.prompt[locale], stimulus: c.stimulus.map((s) => localize(s, locale)) };
    default:
      return { ...c, prompt: c.prompt[locale] };
  }
}

/** Strips the answer key and localizes texts. Safe to serialize to the browser. */
export function getPublicQuestions(locale: Locale): PublicQuestion[] {
  return QUESTIONS.map((q) => ({
    id: q.id,
    scale: q.scale,
    content: toPublicContent(q, locale),
    options: q.options.map(
      (o): PublicOption => (o.kind === "text" ? { kind: "text", label: localize(o.label, locale) } : o),
    ),
  }));
}
