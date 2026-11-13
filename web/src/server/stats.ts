import "server-only";
import { and, count, eq, isNull, sql, type SQL } from "drizzle-orm";
import { QUIZ, SCORING } from "@/config/product";
import { getDb, schema } from "@/db";
import type { AgeGroup, Gender } from "@/lib/api-types";
import { ARCHETYPE_PRIOR_PCT } from "@/lib/quiz/archetypes";
import { normalCdf } from "@/lib/quiz/normal";
import { QUESTIONS } from "@/lib/quiz/questions";
import type { ArchetypeId } from "@/lib/quiz/result-types";

const { answers, results, sessions } = schema;

/**
 * Share (0..100) of people who answer each question correctly. Uses observed data once a
 * question has enough answers, otherwise falls back to the expert estimate.
 */
export async function getCorrectRates(): Promise<Map<string, number>> {
  const rows = await getDb()
    .select({
      questionId: answers.questionId,
      total: count(),
      correct: sql<number>`count(*) filter (where ${answers.isCorrect})`.mapWith(Number),
    })
    .from(answers)
    .groupBy(answers.questionId);

  const observed = new Map(rows.map((r) => [r.questionId, r]));
  return new Map(
    QUESTIONS.map((q) => {
      const o = observed.get(q.id);
      const pct = o && o.total >= QUIZ.minAnswersForObservedStats ? (o.correct / o.total) * 100 : q.expectedCorrectPct;
      return [q.id, Math.round(pct)];
    }),
  );
}

export async function getArchetypeRarityPct(archetype: ArchetypeId): Promise<number> {
  const rows = await getDb()
    .select({ archetype: results.archetype, n: count() })
    .from(results)
    .groupBy(results.archetype);
  const total = rows.reduce((s, r) => s + r.n, 0);
  if (total < SCORING.archetypeMinSample) return ARCHETYPE_PRIOR_PCT[archetype];
  const n = rows.find((r) => r.archetype === archetype)?.n ?? 0;
  return Math.max(1, Math.round((n / total) * 100));
}

/**
 * "Top X%" among people of the same gender, age group and country. Falls back to the
 * normative percentile while the cohort is too small to be meaningful.
 */
export async function getCohortTopPct(params: {
  iq: number;
  normPercentile: number;
  gender: Gender | null;
  ageGroup: AgeGroup | null;
  country: string | null;
}): Promise<{ topPct: number; source: "cohort" | "norm" }> {
  const fromNorm = { topPct: Math.max(1, Math.round(100 - params.normPercentile)), source: "norm" as const };
  if (!params.ageGroup || !params.gender) return fromNorm;

  const filters: SQL[] = [eq(sessions.gender, params.gender), eq(sessions.ageGroup, params.ageGroup)];
  filters.push(params.country ? eq(sessions.country, params.country) : isNull(sessions.country));

  const [row] = await getDb()
    .select({
      total: count(),
      atOrAbove: sql<number>`count(*) filter (where ${results.iq} >= ${params.iq})`.mapWith(Number),
    })
    .from(results)
    .innerJoin(sessions, eq(sessions.id, results.sessionId))
    .where(and(...filters));

  if (!row || row.total < SCORING.cohortMinSize) return fromNorm;
  return { topPct: Math.max(1, Math.round((row.atOrAbove / row.total) * 100)), source: "cohort" };
}

export async function countCompletedTests(): Promise<number> {
  const [row] = await getDb().select({ n: count() }).from(results);
  return row?.n ?? 0;
}


/**
 * "Faster than X% of participants" by total test time. Uses real results once there are
 * enough of them, otherwise a log-normal prior around the expected median time.
 */
export async function getSpeedPercentile(totalTimeMs: number): Promise<{ fasterThanPct: number; medianTimeMs: number; source: "observed" | "norm" }> {
  const time = sql`(${results.data}->>'totalTimeMs')::bigint`;
  const [row] = await getDb()
    .select({
      total: count(),
      slower: sql<number>`count(*) filter (where ${time} > ${totalTimeMs})`.mapWith(Number),
      median: sql<number>`percentile_cont(0.5) within group (order by ${time})`.mapWith(Number),
    })
    .from(results);
  const { medianMs, logSd, minSample } = SCORING.timeNorm;
  if (row && row.total >= minSample) {
    return { fasterThanPct: Math.round((row.slower / row.total) * 100), medianTimeMs: Math.round(row.median), source: "observed" };
  }
  const z = (Math.log(Math.max(totalTimeMs, 1)) - Math.log(medianMs)) / logSd;
  return { fasterThanPct: Math.round((1 - normalCdf(z)) * 100), medianTimeMs: medianMs, source: "norm" };
}
