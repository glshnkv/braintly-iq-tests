"use client";

import { useEffect, useState } from "react";
import { perceivedProgress } from "@/lib/quiz/progress";

interface Props {
  /** Questions already answered. */
  answered: number;
  /** Value the bar grows from when this card appears (defaults to one answer fewer). */
  from?: number;
  total: number;
  label: string;
}

/**
 * Continuous progress bar on a front-loaded curve. Each new card mounts at the previous
 * value and grows to the new one, so every answer visibly "moves" the bar.
 */
export function LinearProgress({ answered, from = answered - 1, total, label }: Props) {
  const target = perceivedProgress(answered, total);
  const [width, setWidth] = useState(() => perceivedProgress(from, total));

  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(target));
    return () => cancelAnimationFrame(id);
  }, [target]);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(target * 100)}
      className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray"
    >
      <div
        className="h-full rounded-full bg-ink transition-[width] duration-700 ease-(--ease-out-quint) motion-reduce:transition-none"
        style={{ width: `${Math.max(width * 100, 2)}%` }}
      />
    </div>
  );
}
