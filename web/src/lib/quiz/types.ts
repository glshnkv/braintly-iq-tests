import type { Locale } from "@/i18n/config";

export const SCALES = ["logic", "numbers", "patterns", "spatial", "memory"] as const;
export type Scale = (typeof SCALES)[number];

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export type LocalizedText = Record<Locale, string>;

/* ---------- Visual primitives for matrix-style questions ---------- */

export type ShapeKind = "circle" | "square" | "triangle" | "diamond" | "arrow" | "polygon";
export type ShapeFill = "solid" | "outline" | "light";
export type Segment = "top" | "right" | "bottom" | "left" | "diag";

export interface ShapeCell {
  type: "shapes";
  kind: ShapeKind;
  fill: ShapeFill;
  count?: number;
  rotation?: number;
  /** Number of sides for `polygon`. */
  sides?: number;
  /** Small dots drawn inside the shape. */
  dots?: number;
}

export interface SegmentsCell {
  type: "segments";
  segments: Segment[];
}

export interface PolyominoCell {
  type: "polyomino";
  /** [x, y] grid coordinates of filled squares. */
  cells: [number, number][];
}

export type Figure = ShapeCell | SegmentsCell | PolyominoCell;

/* ---------- Question content ---------- */

export type QuestionContent =
  | { kind: "text"; prompt: LocalizedText }
  | { kind: "sequence"; prompt: LocalizedText; sequence: string }
  | { kind: "matrix"; prompt: LocalizedText; grid: (Figure | null)[] }
  | { kind: "figure"; prompt: LocalizedText; figure: Figure }
  | {
      kind: "memory";
      prompt: LocalizedText;
      /** Items to memorise; strings may be localized. */
      stimulus: (string | LocalizedText)[];
      showMs: number;
    };

export type OptionContent = { kind: "text"; label: string | LocalizedText } | { kind: "figure"; figure: Figure };

export interface Question {
  id: string;
  scale: Scale;
  difficulty: Difficulty;
  /** Expert estimate of the share of people answering correctly (0..100). */
  expectedCorrectPct: number;
  content: QuestionContent;
  options: OptionContent[];
  /** Index into `options`. Never sent to the client. */
  correctIndex: number;
}

/** What the browser receives: localized, without the correct answer. */
export type PublicQuestion = {
  id: string;
  scale: Scale;
  content: PublicContent;
  options: PublicOption[];
};

export type PublicContent =
  | { kind: "text"; prompt: string }
  | { kind: "sequence"; prompt: string; sequence: string }
  | { kind: "matrix"; prompt: string; grid: (Figure | null)[] }
  | { kind: "figure"; prompt: string; figure: Figure }
  | { kind: "memory"; prompt: string; stimulus: string[]; showMs: number };

export type PublicOption = { kind: "text"; label: string } | { kind: "figure"; figure: Figure };
