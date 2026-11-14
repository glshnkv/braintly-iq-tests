"use client";

import { Fragment, type ReactNode } from "react";
import { LEGAL_DOCS, type LegalDoc } from "@/config/legal";

/**
 * A link to a legal document. While the document has no URL it stays a stub: it looks and
 * focuses like a link but doesn't navigate (no jump to the top of the page from href="#").
 */
export function LegalLink({
  doc,
  children,
  plain = false,
  className = "",
}: {
  doc: LegalDoc;
  children: ReactNode;
  /** Plain: no underline, for link lists (footer) where the context already says "these are links". */
  plain?: boolean;
  className?: string;
}) {
  const href = LEGAL_DOCS[doc].href as string | null;
  return (
    <a
      href={href ?? "#"}
      onClick={href ? undefined : (e) => e.preventDefault()}
      target={href ? "_blank" : undefined}
      rel={href ? "noopener" : undefined}
      className={`transition-colors ${plain ? "" : "underline decoration-current/30 underline-offset-[3px] hover:decoration-current"} ${className}`}
    >
      {children}
    </a>
  );
}

/**
 * Renders a sentence with {doc} placeholders as text with legal links, e.g.
 * "You accept the {terms} and {privacy}" + labels → "You accept the <a>Terms</a> and <a>Privacy Policy</a>".
 * Other {placeholders} are filled from `vars`.
 */
export function LegalText({
  template,
  labels,
  vars = {},
  linkClassName,
}: {
  template: string;
  labels: Partial<Record<LegalDoc, string>>;
  vars?: Record<string, string | number>;
  linkClassName?: string;
}) {
  const parts = template.split(/(\{\w+\})/g);
  return (
    <>
      {parts.map((part, i) => {
        const key = part.match(/^\{(\w+)\}$/)?.[1];
        if (!key) return <Fragment key={i}>{part}</Fragment>;
        if (key in labels)
          return (
            <LegalLink key={i} doc={key as LegalDoc} className={linkClassName}>
              {labels[key as LegalDoc]}
            </LegalLink>
          );
        return <Fragment key={i}>{key in vars ? String(vars[key]) : part}</Fragment>;
      })}
    </>
  );
}
