/**
 * Legal documents and contacts referenced across the site.
 *
 * PLACEHOLDERS: the documents are not written yet, so every `href` is null and the links render
 * as inert stubs. Put real URLs here before launch — every link on the site picks them up.
 */
export const LEGAL_DOCS = {
  terms: { href: null },
  privacy: { href: null },
  subscription: { href: null },
  refund: { href: null },
  cookies: { href: null },
  support: { href: null },
  /** Consent to personal data processing — a separate document under Russian law (152-FZ). */
  dataConsent: { href: null },
} as const satisfies Record<string, { href: string | null }>;

export type LegalDoc = keyof typeof LEGAL_DOCS;

/** Footer order: the two documents people look for first, then billing, then contact. */
export const FOOTER_DOCS: readonly LegalDoc[] = ["terms", "privacy", "subscription", "refund", "cookies", "support"];

/** Short list for the compact footer on the funnel steps. */
export const FUNNEL_FOOTER_DOCS: readonly LegalDoc[] = ["terms", "privacy", "subscription", "support"];

/** How the charge shows up on a bank statement — people dispute charges they don't recognise. */
export const STATEMENT_DESCRIPTOR = "BRAINTLY*IQTEST";

/** Copyright year in the footers. A constant: the pages are prerendered, so `new Date()` isn't allowed there. */
export const COPYRIGHT_YEAR = 2026;
