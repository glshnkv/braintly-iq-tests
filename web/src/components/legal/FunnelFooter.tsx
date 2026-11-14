import { COPYRIGHT_YEAR, FUNNEL_FOOTER_DOCS } from "@/config/legal";
import type { Dictionary } from "@/i18n";
import { fmt } from "@/lib/format";
import { LegalLink } from "./LegalLink";

/** Quiet one-line footer for the funnel steps: the documents are reachable, but don't compete with the card. */
export function FunnelFooter({ dict }: { dict: Dictionary["legal"] }) {
  return (
    <footer className="w-full max-w-6xl mx-auto px-4 sm:px-6 pb-8 pt-4">
      <div className="flex flex-col items-center gap-2 text-[12px] font-medium text-ink/40 sm:flex-row sm:justify-between">
        <nav aria-label={dict.docsLabel}>
          <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            {FUNNEL_FOOTER_DOCS.map((doc) => (
              <li key={doc}>
                <LegalLink doc={doc} plain className="hover:text-ink/70">
                  {dict.docs[doc]}
                </LegalLink>
              </li>
            ))}
          </ul>
        </nav>
        <span>{fmt(dict.rights, { year: COPYRIGHT_YEAR })}</span>
      </div>
    </footer>
  );
}
