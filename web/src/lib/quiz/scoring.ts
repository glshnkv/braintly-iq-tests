import "server-only";
import { SCORING } from "@/config/product";
import { bracketCelebrities } from "./celebrities";
import { normalCdf } from "./normal";
import { QUESTIONS, QUESTIONS_BY_ID } from "./questions";
import type { Achievement, ArchetypeId, ResultData } from "./result-types";
import { SCALES, type Question, type Scale } from "./types";

export interface AnswerInput {
  questionId: string;
  choice: number;
  timeMs: number;
}

export interface ScoredAnswer extends AnswerInput {
  question: Question;
  number: number;
  isCorrect: boolean;
}

export interface ScoreOutput {
  iq: number;
  percentile: number;
  rawScore: number;
  data: ResultData;
}

export { normalCdf };

const weightOf = (q: Question) => SCORING.difficultyWeights[q.difficulty];

export function iqFromRaw(raw: number): { iq: number; percentile: number } {
  const z = (raw - SCORING.rawMean) / SCORING.rawStdDev;
  const iq = Math.round(Math.min(SCORING.iqMax, Math.max(SCORING.iqMin, 100 + 15 * z)));
  // Percentile follows the clamped IQ so the two numbers never contradict each other.
  const percentile = Math.round(normalCdf((iq - 100) / 15) * 1000) / 10;
  return { iq, percentile };
}

/** Scale scores in 0..100: weighted share of correct answers within each scale. */
export function scaleScores(scored: ScoredAnswer[]): Record<Scale, number> {
  const out = {} as Record<Scale, number>;
  for (const scale of SCALES) {
    const all = QUESTIONS.filter((q) => q.scale === scale);
    const max = all.reduce((s, q) => s + weightOf(q), 0);
    const got = scored.filter((a) => a.isCorrect && a.question.scale === scale).reduce((s, a) => s + weightOf(a.question), 0);
    out[scale] = Math.round((got / max) * 100);
  }
  return out;
}

/**
 * Score a typical participant gets on each scale: the difficulty-weighted share of people
 * answering its questions correctly. This is the "average" line in comparisons.
 */
export function averageScaleScores(correctRates: Map<string, number>): Record<Scale, number> {
  const out = {} as Record<Scale, number>;
  for (const scale of SCALES) {
    const qs = QUESTIONS.filter((q) => q.scale === scale);
    const max = qs.reduce((s, q) => s + weightOf(q), 0);
    const expected = qs.reduce((s, q) => s + weightOf(q) * ((correctRates.get(q.id) ?? q.expectedCorrectPct) / 100), 0);
    out[scale] = Math.round((expected / max) * 100);
  }
  return out;
}

export function difficultyBand(difficulty: number): "easy" | "medium" | "hard" {
  return difficulty <= 2 ? "easy" : difficulty === 3 ? "medium" : "hard";
}

const PAIR_ARCHETYPES: Record<string, ArchetypeId> = {
  "logic+numbers": "analyst",
  "logic+patterns": "strategist",
  "logic+spatial": "architect",
  "numbers+patterns": "researcher",
  "numbers+spatial": "engineer",
  "patterns+spatial": "visionary",
};

/** Ranks scales by score; ties are broken by the fixed SCALES order so results are deterministic. */
export function rankScales(scales: Record<Scale, number>): Scale[] {
  return [...SCALES].sort((a, b) => scales[b] - scales[a] || SCALES.indexOf(a) - SCALES.indexOf(b));
}

export function pickArchetype(scales: Record<Scale, number>): ArchetypeId {
  const ranked = rankScales(scales);
  const spread = scales[ranked[0]] - scales[ranked[ranked.length - 1]];
  if (spread < SCORING.balancedSpread) return "polymath";
  const top = ranked.slice(0, 2);
  if (top.includes("memory")) return "archivist";
  const key = [...top].sort((a, b) => SCALES.indexOf(a) - SCALES.indexOf(b)).join("+");
  return PAIR_ARCHETYPES[key];
}

/**
 * Highlights the user actually earned. `correctRates` holds the share of people who
 * answer each question correctly (observed when available, expected otherwise).
 */
export function findAchievements(scored: ScoredAnswer[], correctRates: Map<string, number>): Achievement[] {
  const achievements: Achievement[] = [];
  const correct = scored.filter((a) => a.isCorrect);

  const rarest = [...correct].sort(
    (a, b) => (correctRates.get(a.questionId) ?? 100) - (correctRates.get(b.questionId) ?? 100),
  )[0];
  if (rarest) {
    achievements.push({
      type: "rare",
      questionNumber: rarest.number,
      pctCorrect: Math.round(correctRates.get(rarest.questionId) ?? rarest.question.expectedCorrectPct),
    });
  }

  const fastHard = correct
    // Memory items are excluded: their timer starts after the stimulus, so speed there means little.
    .filter((a) => a.question.difficulty >= 4 && a.question.scale !== "memory" && a.questionId !== rarest?.questionId)
    .sort((a, b) => a.timeMs - b.timeMs)[0];
  if (fastHard) {
    achievements.push({ type: "fast", questionNumber: fastHard.number, seconds: Math.max(1, Math.round(fastHard.timeMs / 1000)) });
  }

  let best = 0;
  let run = 0;
  for (const a of [...scored].sort((x, y) => x.number - y.number)) {
    run = a.isCorrect ? run + 1 : 0;
    best = Math.max(best, run);
  }
  if (best >= 3) achievements.push({ type: "streak", length: best });

  return achievements;
}

export function scoreAnswers(answers: AnswerInput[], correctRates: Map<string, number>): ScoreOutput {
  const scored: ScoredAnswer[] = answers.map((a) => {
    const entry = QUESTIONS_BY_ID.get(a.questionId);
    if (!entry) throw new Error(`Unknown question ${a.questionId}`);
    return { ...a, question: entry.question, number: entry.number, isCorrect: entry.question.correctIndex === a.choice };
  });

  const rawScore = scored.filter((a) => a.isCorrect).reduce((s, a) => s + weightOf(a.question), 0);
  const { iq, percentile } = iqFromRaw(rawScore);
  const scales = scaleScores(scored);
  const ranked = rankScales(scales);

  return {
    iq,
    percentile,
    rawScore,
    data: {
      scales,
      strongest: ranked[0],
      weakest: ranked[ranked.length - 1],
      archetype: pickArchetype(scales),
      celebrities: bracketCelebrities(iq),
      achievements: findAchievements(scored, correctRates),
      correctCount: scored.filter((a) => a.isCorrect).length,
      totalQuestions: QUESTIONS.length,
      totalTimeMs: scored.reduce((s, a) => s + a.timeMs, 0),
    },
  };
}
