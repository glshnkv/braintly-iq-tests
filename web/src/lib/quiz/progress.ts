import { QUIZ } from "@/config/product";

/**
 * Perceived progress (0..1) after `answered` of `total` questions.
 * Front-loaded on purpose: early answers move the bar a lot, later ones less,
 * so the test feels quick from the very first answer while still reaching 100% exactly at the end.
 */
export function perceivedProgress(answered: number, total: number, k: number = QUIZ.progressCurve): number {
  if (total <= 0) return 0;
  const n = Math.min(Math.max(answered, 0), total);
  if (k <= 0) return n / total;
  return Math.log1p(k * n) / Math.log1p(k * total);
}
