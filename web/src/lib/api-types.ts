/**
 * Contracts between the API and the UI. Shared by route handlers and client components,
 * so a change on one side is a type error on the other.
 */
import type { Achievement, ArchetypeId } from "./quiz/result-types";
import type { Scale } from "./quiz/types";

export type Gender = "male" | "female";
export const AGE_GROUPS = ["18-24", "25-34", "35-44", "45-54", "55+"] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];
export type Expectation = "above" | "average" | "below";
export type SessionStatus = "started" | "completed" | "lead" | "paid";
export type PaymentMethod = "apple_pay" | "google_pay" | "card";
export type ScaleLevel = "high" | "mid" | "low";

export interface FunnelState {
  /** Lets the UI reset per-attempt state when a new test is started (pages are preserved across navigations). */
  sessionId: string;
  status: SessionStatus;
  answeredIds: string[];
  totalQuestions: number;
  hasProfile: boolean;
}

export type Praise =
  | { kind: "rare"; pctCorrect: number }
  | { kind: "streak"; length: number }
  | { kind: "keepGoing" };

export interface AnswerResponse {
  answeredCount: number;
  praise: Praise | null;
}

export interface Cohort {
  gender: Gender | null;
  ageGroup: AgeGroup | null;
  country: string | null;
}

export interface Teaser {
  iqFirstDigit: number;
  iqDigitCount: number;
  /** First digit of "you beat X% of people"; null when X < 10. */
  percentileFirstDigit: number | null;
  scales: Record<Scale, number>;
  scaleLevels: Record<Scale, ScaleLevel>;
  strongest: Scale;
  weakest: Scale;
  archetypeRarityPct: number;
  celebrities: { below: string | null; above: string | null };
  achievements: Achievement[];
  cohort: Cohort;
  name: string | null;
  totalParticipants: number;
  /** Short public number of the report, e.g. "K7Q2M9". */
  reportId: string;
  totalTimeMs: number;
  /** Typical participant's score on each scale — the comparison baseline. */
  scaleAverages: Record<Scale, number>;
}

export interface SubscriptionView {
  status: "trialing" | "active" | "canceled";
  trialEndsAt: string;
  priceMinor: number;
  currency: string;
}

export type DifficultyBand = "easy" | "medium" | "hard";

export interface ReviewItem {
  number: number;
  questionId: string;
  scale: Scale;
  difficulty: DifficultyBand;
  /** Share of participants who solve this question (0..100). */
  pctCorrect: number;
  choice: number;
  correctIndex: number;
  isCorrect: boolean;
  timeMs: number;
}

export interface FullResult {
  iq: number;
  percentile: number;
  scales: Record<Scale, number>;
  scaleLevels: Record<Scale, ScaleLevel>;
  scaleAverages: Record<Scale, number>;
  /** Faster than this share of participants (total test time). */
  speed: { fasterThanPct: number; medianTimeMs: number; source: "observed" | "norm" };
  strongest: Scale;
  weakest: Scale;
  archetype: ArchetypeId;
  archetypeRarityPct: number;
  celebrities: { below: string | null; above: string | null };
  achievements: Achievement[];
  cohort: Cohort & { topPct: number; source: "cohort" | "norm" };
  expectation: Expectation | null;
  correctCount: number;
  totalQuestions: number;
  totalTimeMs: number;
  review: ReviewItem[];
  name: string | null;
  shareId: string;
  completedAt: string;
  subscription: SubscriptionView | null;
}

export interface CheckoutResponse {
  ok: true;
  subscription: SubscriptionView;
}

export type ApiErrorCode =
  | "no_session"
  | "invalid_input"
  | "wrong_step"
  | "not_paid"
  | "card_declined"
  | "insufficient_funds"
  | "invalid_card"
  | "internal";

export interface ApiErrorBody {
  error: ApiErrorCode;
}
