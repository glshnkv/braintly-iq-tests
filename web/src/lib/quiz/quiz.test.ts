import { describe, expect, it } from "vitest";
import { isChiral, isRotationOf, mirror, sameShape, type Cell } from "./polyomino";
import { QUESTIONS } from "./questions";
import { getPublicQuestions } from "./public";
import { averageScaleScores, difficultyBand, iqFromRaw, normalCdf, pickArchetype, scoreAnswers } from "./scoring";
import { CELEBRITIES, bracketCelebrities } from "./celebrities";
import { ARCHETYPE_PRIOR_PCT } from "./archetypes";
import { SCALES, type Scale } from "./types";

const noRates = new Map<string, number>();
const answerAll = (pick: (i: number) => boolean) =>
  QUESTIONS.map((q, i) => ({
    questionId: q.id,
    choice: pick(i) ? q.correctIndex : (q.correctIndex + 1) % q.options.length,
    timeMs: 10_000,
  }));

describe("question bank", () => {
  it("has 25 questions: 5 per scale, one per difficulty", () => {
    expect(QUESTIONS).toHaveLength(25);
    for (const scale of SCALES) {
      const diffs = QUESTIONS.filter((q) => q.scale === scale).map((q) => q.difficulty).sort();
      expect(diffs).toEqual([1, 2, 3, 4, 5]);
    }
  });

  it("has unique ids and valid answer keys", () => {
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
    for (const q of QUESTIONS) {
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(q.options.length);
      expect(q.options.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("never shows the same scale twice in a row and grows in difficulty", () => {
    for (let i = 1; i < QUESTIONS.length; i++) {
      expect(QUESTIONS[i].scale).not.toBe(QUESTIONS[i - 1].scale);
      expect(QUESTIONS[i].difficulty).toBeGreaterThanOrEqual(QUESTIONS[i - 1].difficulty);
    }
  });

  it("has no duplicate options within a question", () => {
    for (const q of QUESTIONS) {
      const keys = q.options.map((o) => JSON.stringify(o));
      expect(new Set(keys).size, q.id).toBe(keys.length);
    }
  });

  it("spatial questions have exactly one rotated copy of the base shape", () => {
    for (const q of QUESTIONS.filter((x) => x.scale === "spatial")) {
      if (q.content.kind !== "figure" || q.content.figure.type !== "polyomino") throw new Error(q.id);
      const base = q.content.figure.cells as Cell[];
      expect(isChiral(base), q.id).toBe(true);
      const rotated = q.options.map((o) => o.kind === "figure" && o.figure.type === "polyomino" && isRotationOf(base, o.figure.cells as Cell[]));
      expect(rotated.filter(Boolean)).toHaveLength(1);
      expect(rotated[q.correctIndex]).toBe(true);
      // Exactly one decoy that is neither a rotation nor a mirror image of the base.
      const decoys = q.options.filter(
        (o) =>
          o.kind === "figure" &&
          o.figure.type === "polyomino" &&
          !isRotationOf(base, o.figure.cells as Cell[]) &&
          !isRotationOf(mirror(base), o.figure.cells as Cell[]),
      );
      expect(decoys, q.id).toHaveLength(1);
      // Options are visually distinct shapes.
      const cells = q.options.map((o) => (o.kind === "figure" && o.figure.type === "polyomino" ? (o.figure.cells as Cell[]) : []));
      for (let i = 0; i < cells.length; i++)
        for (let j = i + 1; j < cells.length; j++) expect(sameShape(cells[i], cells[j]), `${q.id} ${i}/${j}`).toBe(false);
    }
  });

  it("public questions never expose the answer key", () => {
    for (const locale of ["ru", "en"] as const) {
      const json = JSON.stringify(getPublicQuestions(locale));
      expect(json).not.toContain("correctIndex");
      expect(json).not.toContain("expectedCorrectPct");
      expect(json).not.toContain("difficulty");
    }
  });
});

describe("scoring", () => {
  it("normal CDF matches reference points", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1)).toBeCloseTo(0.8413, 4);
    expect(normalCdf(-2)).toBeCloseTo(0.0228, 4);
  });

  it("maps raw scores to a clamped IQ with a consistent percentile", () => {
    expect(iqFromRaw(0).iq).toBe(70);
    expect(iqFromRaw(1000).iq).toBe(145);
    const mid = iqFromRaw(19);
    expect(mid.iq).toBe(100);
    expect(mid.percentile).toBe(50);
  });

  it("perfect answers give the max IQ, zero answers the min", () => {
    expect(scoreAnswers(answerAll(() => true), noRates).iq).toBe(145);
    expect(scoreAnswers(answerAll(() => false), noRates).iq).toBe(70);
  });

  it("more correct answers never lower the score", () => {
    let prev = 0;
    for (let k = 0; k <= QUESTIONS.length; k++) {
      const { rawScore } = scoreAnswers(answerAll((i) => i < k), noRates);
      expect(rawScore).toBeGreaterThanOrEqual(prev);
      prev = rawScore;
    }
  });

  it("computes scale scores, strongest and weakest", () => {
    const answers = QUESTIONS.map((q) => ({
      questionId: q.id,
      choice: q.scale === "spatial" ? q.correctIndex : (q.correctIndex + 1) % q.options.length,
      timeMs: 5000,
    }));
    const { data } = scoreAnswers(answers, noRates);
    expect(data.scales.spatial).toBe(100);
    expect(data.scales.logic).toBe(0);
    expect(data.strongest).toBe("spatial");
    expect(data.correctCount).toBe(5);
  });

  it("finds rare / fast / streak achievements", () => {
    const rates = new Map(QUESTIONS.map((q) => [q.id, q.expectedCorrectPct]));
    const { data } = scoreAnswers(answerAll(() => true), rates);
    const types = data.achievements.map((a) => a.type);
    expect(types).toEqual(["rare", "fast", "streak"]);
    const rare = data.achievements[0];
    expect(rare.type === "rare" && rare.pctCorrect).toBe(Math.min(...QUESTIONS.map((q) => q.expectedCorrectPct)));
  });

  it("picks archetypes from the top two scales", () => {
    const s = (v: Partial<Record<Scale, number>>) => ({ logic: 10, numbers: 10, patterns: 10, spatial: 10, memory: 10, ...v });
    expect(pickArchetype(s({ logic: 90, numbers: 80 }))).toBe("analyst");
    expect(pickArchetype(s({ patterns: 90, spatial: 80 }))).toBe("visionary");
    expect(pickArchetype(s({ memory: 90, logic: 80 }))).toBe("archivist");
    expect(pickArchetype(s({ logic: 20 }))).toBe("polymath");
  });

  it("archetype priors sum to 100%", () => {
    expect(Object.values(ARCHETYPE_PRIOR_PCT).reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe("report baselines", () => {
  it("the average participant scores in the middle of each scale", () => {
    const avg = averageScaleScores(noRates);
    for (const scale of SCALES) {
      expect(avg[scale]).toBeGreaterThan(20);
      expect(avg[scale]).toBeLessThan(90);
    }
  });

  it("observed correct rates move the average", () => {
    const allSolved = new Map(QUESTIONS.map((q) => [q.id, 100]));
    expect(Object.values(averageScaleScores(allSolved)).every((v) => v === 100)).toBe(true);
  });

  it("groups difficulty 1–5 into three bands", () => {
    expect([1, 2, 3, 4, 5].map(difficultyBand)).toEqual(["easy", "easy", "medium", "hard", "hard"]);
  });

  it("celebrities are sorted and bracket any score", () => {
    const iqs = CELEBRITIES.map((c) => c.iq);
    expect(iqs).toEqual([...iqs].sort((a, b) => a - b));
    expect(bracketCelebrities(120)).toEqual({ below: "kennedy", above: "washington" });
    expect(bracketCelebrities(70)).toEqual({ below: null, above: "ali" });
  });
});
