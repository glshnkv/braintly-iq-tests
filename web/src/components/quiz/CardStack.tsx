import type { ReactNode } from "react";

interface Props {
  /** Changes for every new card, so React remounts it and the "rise from the pile" animation replays. */
  cardKey: string;
  /** The top card flies off to the side. */
  leaving: boolean;
  children: ReactNode;
  className?: string;
}

/** Time the leave transition takes (keep in sync with `.card-leave` in globals.css). */
export const CARD_LEAVE_MS = 420;

/**
 * A pile of question cards: two tilted sheets underneath and the active card on top.
 * Purely presentational — callers decide when a card leaves and what comes next.
 */
export function CardStack({ cardKey, leaving, children, className = "" }: Props) {
  return (
    <div className={`relative w-full max-w-[480px] ${className}`}>
      <div aria-hidden className="absolute inset-0 rounded-card bg-white/50 rotate-[3.5deg] translate-x-2.5 translate-y-2" />
      <div aria-hidden className="absolute inset-0 rounded-card bg-white/75 -rotate-[2.5deg] -translate-x-1.5" />
      <div
        key={cardKey}
        className={`relative rounded-card bg-white p-6 sm:p-8 shadow-float ${
          leaving ? "card-leave" : "card-in"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export { LinearProgress } from "./LinearProgress";
export { MonoLabel } from "@/components/ui";

/** Full-page muted stage with a faint, wide square grid. */
export function StageBackground() {
  return <div aria-hidden className="stage-grid fixed inset-0 -z-10" />;
}
