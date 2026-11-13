/**
 * Illustration slots. Drop a PNG (transparent background) into `public/illustrations/<id>.png`
 * and it appears on the site; until then a placeholder is rendered.
 * Generation prompts for every slot: docs/04-illustration-prompts.md
 */
export const ILLUSTRATIONS = [
  "celeb-kennedy",
  "celeb-hawking",
  "you-mystery",
  "step-solve",
  "step-profile",
  "step-certificate",
  "type-analyst",
  "type-strategist",
  "type-architect",
  "type-researcher",
  "type-engineer",
  "type-visionary",
  "type-archivist",
  "type-polymath",
  "final-crowd",
] as const;

export type IllustrationId = (typeof ILLUSTRATIONS)[number];

export const illustrationSrc = (id: IllustrationId) => `/illustrations/${id}.png`;

/** Archetype → its portrait (landing "thinking types", result page). */
export const TYPE_ILLUSTRATION = {
  analyst: "type-analyst",
  strategist: "type-strategist",
  architect: "type-architect",
  researcher: "type-researcher",
  engineer: "type-engineer",
  visionary: "type-visionary",
  archivist: "type-archivist",
  polymath: "type-polymath",
} as const satisfies Record<string, IllustrationId>;
