import Link from "next/link";
import type { ReactNode } from "react";
import { CloseIcon } from "@/components/ui";

/** Progress on the left, close button on the right — the top row of every card. */
export function CardTopBar({ children, closeHref, closeLabel }: { children?: ReactNode; closeHref?: string; closeLabel: string }) {
  return (
    <div className="flex items-center gap-5 mb-7 sm:mb-8">
      <div className="flex flex-1 items-center">{children}</div>
      {closeHref && (
        <Link
          href={closeHref}
          aria-label={closeLabel}
          className="-my-1 grid place-items-center size-9 shrink-0 rounded-full bg-gray-soft text-ink/50 hover:bg-gray hover:text-ink transition-colors"
        >
          <CloseIcon />
        </Link>
      )}
    </div>
  );
}
