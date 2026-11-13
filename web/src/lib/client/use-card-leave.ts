"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CARD_LEAVE_MS } from "@/components/quiz/CardStack";

/** Short pause so the user sees their choice highlighted before the card flies off. */
export const SELECTION_FEEDBACK_MS = 220;

export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Drives the "card flies off" animation: `leave()` starts it and resolves when it's done,
 * `reset()` brings the card back (e.g. after a failed request).
 */
export function useCardLeave() {
  const [leaving, setLeaving] = useState(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const leave = useCallback(async () => {
    setLeaving(true);
    await wait(reducedMotion.current ? 0 : CARD_LEAVE_MS);
  }, []);

  const reset = useCallback(() => setLeaving(false), []);

  return { leaving, leave, reset };
}
