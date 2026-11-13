import type { Scale } from "./types";

export const ARCHETYPES = [
  "analyst",
  "strategist",
  "architect",
  "researcher",
  "engineer",
  "visionary",
  "archivist",
  "polymath",
] as const;
export type ArchetypeId = (typeof ARCHETYPES)[number];

export type Achievement =
  | { type: "rare"; questionNumber: number; pctCorrect: number }
  | { type: "fast"; questionNumber: number; seconds: number }
  | { type: "streak"; length: number };

/** Persisted in `results.data`. Everything needed to render the full report. */
export interface ResultData {
  scales: Record<Scale, number>;
  strongest: Scale;
  weakest: Scale;
  archetype: ArchetypeId;
  celebrities: { below: string | null; above: string | null };
  achievements: Achievement[];
  correctCount: number;
  totalQuestions: number;
  totalTimeMs: number;
}
