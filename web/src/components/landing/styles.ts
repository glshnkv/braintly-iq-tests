/** Shared layout recipes for the landing. Flat surfaces only: no outlines, no hard shadows. */

/** Text column width for regular sections. */
export const container = "mx-auto w-full max-w-6xl px-5 md:px-10";

/** Outer gutter for full-bleed rounded panels: they float 8–12px off the viewport edges. */
export const frame = "px-2 sm:px-3";

export const SECTION_IDS = { start: "start", how: "how", inside: "inside", types: "types", faq: "faq" } as const;

/** Anchors shown in the header and footer navigation. */
export const NAV_KEYS = ["how", "inside", "types", "faq"] as const;
