import type { ReactNode } from "react";

/**
 * Hand-drawn marks. Paths are intentionally imperfect (overshoot, uneven curves)
 * so they read as pen strokes rather than geometric shapes.
 */

type StrokeProps = { className?: string };

/** Wraps a word in a loose hand-drawn ellipse. */
export function Circled({ children, color = "var(--orange)" }: { children: ReactNode; color?: string }) {
  return (
    <span className="relative inline-block whitespace-nowrap px-[0.08em]">
      <span className="relative z-10">{children}</span>
      <svg
        aria-hidden
        viewBox="0 0 200 80"
        preserveAspectRatio="none"
        className="animate-draw absolute -inset-x-[0.12em] -inset-y-[0.1em] w-[calc(100%+0.24em)] h-[calc(100%+0.2em)] overflow-visible"
      >
        <path
          d="M118 7 C 70 2, 14 12, 8 40 C 3 64, 60 77, 110 74 C 160 71, 196 58, 192 36 C 188 14, 140 4, 84 9"
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </span>
  );
}

/** Small 4-point sparkle drawn with a single stroke. */
export function Sparkle({ className = "" }: StrokeProps) {
  return (
    <svg aria-hidden viewBox="0 0 40 40" className={className} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
      <path d="M20 4 C 21 15, 25 19, 36 20 C 25 21, 21 25, 20 36 C 19 25, 15 21, 4 20 C 15 19, 19 15, 20 4 Z" />
    </svg>
  );
}

/** Short motion strokes, like the ones around the hands in the reference. */
export function Splash({ className = "" }: StrokeProps) {
  return (
    <svg aria-hidden viewBox="0 0 40 40" className={className} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round">
      <path d="M8 14 C 12 11, 16 10, 20 11 M6 24 C 11 22, 16 22, 21 24 M12 33 C 15 31, 19 31, 22 32" />
    </svg>
  );
}

/** Curvy hand-drawn arrow, pointing to the bottom-right. */
export function HandArrow({ className = "" }: StrokeProps) {
  return (
    <svg aria-hidden viewBox="0 0 120 80" className={className} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 10 C 30 4, 58 14, 62 34 C 66 52, 48 58, 44 46 C 40 34, 70 28, 92 44 C 102 51, 108 60, 110 70" />
      <path d="M98 64 L110 72 L114 57" />
    </svg>
  );
}
