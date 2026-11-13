import "server-only";
import { and, count, countDistinct, desc, eq, gte, isNotNull, lt, sql, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { getDb, schema } from "@/db";
import { ARCHETYPES, type ArchetypeId } from "@/lib/quiz/result-types";
import { QUESTIONS } from "@/lib/quiz/questions";

const { events, sessions, answers, results, subscriptions, payments } = schema;

export interface FunnelStep {
  key: string;
  label: string;
  count: number;
}

/** Headline numbers for one period. Computed twice: for the selected period and the one before it. */
export interface Kpis {
  steps: FunnelStep[];
  landingViews: number;
  started: number;
  completed: number;
  leads: number;
  paid: number;
  revenueMinor: number;
  canceled: number;
  failedPayments: number;
  medianTestMinutes: number | null;
  avgIq: number | null;
}

export interface SeriesPoint {
  /** Bucket start, ISO string. */
  at: string;
  started: number;
  paid: number;
  revenueMinor: number;
}

export interface Dashboard {
  periodDays: number;
  unit: "hour" | "day" | "week";
  current: Kpis;
  /** Same metrics for the previous period of equal length; null for "all time". */
  previous: Kpis | null;
  series: SeriesPoint[];
  questionReach: { number: number; id: string; reached: number; correctPct: number | null }[];
  iqHistogram: { from: number; count: number }[];
  archetypes: { id: ArchetypeId; count: number }[];
  methods: { method: string; count: number }[];
  sources: { source: string; count: number }[];
  generatedAt: string;
}

const MID_QUESTION = Math.ceil(QUESTIONS.length / 2);
const ALL_TIME_DAYS = 3650;

const inRange = (col: PgColumn, from: Date, to: Date): SQL => and(gte(col, from), lt(col, to))!;

async function collectKpis(from: Date, to: Date): Promise<Kpis> {
  const db = getDb();
  const started = inRange(sessions.startedAt, from, to);

  const eventCount = async (name: string, distinct: boolean) => {
    const [row] = await db
      .select({ n: distinct ? countDistinct(events.sessionId) : count() })
      .from(events)
      .where(and(eq(events.name, name), inRange(events.createdAt, from, to)));
    return row.n;
  };

  const [startedRow] = await db.select({ n: count() }).from(sessions).where(started);
  const [midway] = await db
    .select({ n: count() })
    .from(
      db
        .select({ id: answers.sessionId })
        .from(answers)
        .innerJoin(sessions, eq(sessions.id, answers.sessionId))
        .where(started)
        .groupBy(answers.sessionId)
        .having(sql`count(*) >= ${MID_QUESTION}`)
        .as("midway"),
    );
  const [completed] = await db
    .select({
      n: count(),
      avgIq: sql<number | null>`avg(${results.iq})`.mapWith((v) => (v === null ? null : Number(v))),
      medianMs: sql<number | null>`percentile_cont(0.5) within group (order by (${results.data}->>'totalTimeMs')::numeric)`.mapWith(
        (v) => (v === null ? null : Number(v)),
      ),
    })
    .from(results)
    .innerJoin(sessions, eq(sessions.id, results.sessionId))
    .where(started);
  const [leads] = await db.select({ n: count() }).from(sessions).where(and(started, isNotNull(sessions.userId)));
  const [subs] = await db
    .select({
      n: count(),
      canceled: sql<number>`count(*) filter (where ${subscriptions.status} = 'canceled')`.mapWith(Number),
    })
    .from(subscriptions)
    .innerJoin(sessions, eq(sessions.id, subscriptions.sessionId))
    .where(started);
  const [revenue] = await db
    .select({
      ok: sql<number>`coalesce(sum(${payments.amountMinor}) filter (where ${payments.status} = 'succeeded'), 0)`.mapWith(Number),
      failed: sql<number>`count(*) filter (where ${payments.status} = 'failed')`.mapWith(Number),
    })
    .from(payments)
    .where(inRange(payments.createdAt, from, to));

  const landingViews = await eventCount("landing_view", false);
  return {
    steps: [
      { key: "landing", label: "Просмотр лендинга", count: landingViews },
      { key: "started", label: "Начали тест", count: startedRow.n },
      { key: "midway", label: `Дошли до вопроса ${MID_QUESTION}`, count: midway.n },
      { key: "completed", label: "Завершили тест", count: completed.n },
      { key: "lead", label: "Оставили email", count: leads.n },
      { key: "paywall", label: "Увидели paywall", count: await eventCount("paywall_view", true) },
      { key: "checkout", label: "Открыли оплату", count: await eventCount("checkout_open", true) },
      { key: "paid", label: "Оплатили триал", count: subs.n },
    ],
    landingViews,
    started: startedRow.n,
    completed: completed.n,
    leads: leads.n,
    paid: subs.n,
    revenueMinor: revenue.ok,
    canceled: subs.canceled,
    failedPayments: revenue.failed,
    medianTestMinutes: completed.medianMs === null ? null : Math.round((completed.medianMs / 60_000) * 10) / 10,
    avgIq: completed.avgIq === null ? null : Math.round(completed.avgIq),
  };
}

/** Started tests, paid trials and revenue per hour/day/week, with empty buckets filled in. */
async function collectSeries(from: Date, to: Date, unit: Dashboard["unit"]): Promise<SeriesPoint[]> {
  const db = getDb();
  const bucket = (col: PgColumn) => sql<string>`to_char(date_trunc(${unit}, ${col} at time zone 'UTC'), 'YYYY-MM-DD"T"HH24:00:00"Z"')`;

  const [startedRows, paidRows, revenueRows] = await Promise.all([
    db
      .select({ at: bucket(sessions.startedAt), n: count() })
      .from(sessions)
      .where(inRange(sessions.startedAt, from, to))
      .groupBy(sql`1`),
    db
      .select({ at: bucket(subscriptions.createdAt), n: count() })
      .from(subscriptions)
      .where(inRange(subscriptions.createdAt, from, to))
      .groupBy(sql`1`),
    db
      .select({ at: bucket(payments.createdAt), sum: sql<number>`coalesce(sum(${payments.amountMinor}), 0)`.mapWith(Number) })
      .from(payments)
      .where(and(inRange(payments.createdAt, from, to), eq(payments.status, "succeeded")))
      .groupBy(sql`1`),
  ]);

  const startedBy = new Map(startedRows.map((r) => [r.at, r.n]));
  const paidBy = new Map(paidRows.map((r) => [r.at, r.n]));
  const revenueBy = new Map(revenueRows.map((r) => [r.at, r.sum]));

  const step = unit === "hour" ? 3_600_000 : unit === "day" ? 86_400_000 : 7 * 86_400_000;
  const start = new Date(from);
  if (unit === "hour") start.setUTCMinutes(0, 0, 0);
  else start.setUTCHours(0, 0, 0, 0);
  if (unit === "week") start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));

  const out: SeriesPoint[] = [];
  for (let t = start.getTime(); t < to.getTime(); t += step) {
    const at = `${new Date(t).toISOString().slice(0, 13)}:00:00Z`;
    out.push({ at, started: startedBy.get(at) ?? 0, paid: paidBy.get(at) ?? 0, revenueMinor: revenueBy.get(at) ?? 0 });
  }
  return out;
}

export async function getDashboard(periodDays: number): Promise<Dashboard> {
  const db = getDb();
  const now = new Date();
  const allTime = periodDays >= ALL_TIME_DAYS;

  let from = new Date(now.getTime() - periodDays * 86_400_000);
  if (allTime) {
    const [first] = await db.select({ at: sql<string | null>`min(${sessions.startedAt})` }).from(sessions);
    from = first?.at ? new Date(first.at) : new Date(now.getTime() - 7 * 86_400_000);
  }
  const spanDays = (now.getTime() - from.getTime()) / 86_400_000;
  const unit: Dashboard["unit"] = spanDays <= 2 ? "hour" : spanDays <= 92 ? "day" : "week";
  const prevFrom = new Date(from.getTime() - periodDays * 86_400_000);
  const started = inRange(sessions.startedAt, from, now);

  const [current, previous, series, perQuestion, iqRows, archetypeRows, methodRows, sourceRows] = await Promise.all([
    collectKpis(from, now),
    allTime ? Promise.resolve(null) : collectKpis(prevFrom, from),
    collectSeries(from, now, unit),
    db
      .select({
        questionId: answers.questionId,
        n: count(),
        correct: sql<number>`count(*) filter (where ${answers.isCorrect})`.mapWith(Number),
      })
      .from(answers)
      .innerJoin(sessions, eq(sessions.id, answers.sessionId))
      .where(started)
      .groupBy(answers.questionId),
    db
      .select({ bucket: sql<number>`(floor(${results.iq} / 5) * 5)::int`.mapWith(Number), n: count() })
      .from(results)
      .innerJoin(sessions, eq(sessions.id, results.sessionId))
      .where(started)
      .groupBy(sql`1`),
    db
      .select({ archetype: results.archetype, n: count() })
      .from(results)
      .innerJoin(sessions, eq(sessions.id, results.sessionId))
      .where(started)
      .groupBy(results.archetype),
    db
      .select({ method: payments.method, n: count() })
      .from(payments)
      .where(and(inRange(payments.createdAt, from, now), eq(payments.status, "succeeded")))
      .groupBy(payments.method),
    db
      .select({ source: sql<string>`coalesce(nullif(${sessions.utmSource}, ''), 'direct')`, n: count() })
      .from(sessions)
      .where(started)
      .groupBy(sql`1`)
      .orderBy(desc(count()))
      .limit(6),
  ]);

  const byId = new Map(perQuestion.map((q) => [q.questionId, q]));
  const iqBy = new Map(iqRows.map((r) => [r.bucket, r.n]));
  const archetypeBy = new Map(archetypeRows.map((r) => [r.archetype, r.n]));

  return {
    periodDays,
    unit,
    current,
    previous,
    series,
    questionReach: QUESTIONS.map((q, i) => {
      const row = byId.get(q.id);
      return {
        number: i + 1,
        id: q.id,
        reached: row?.n ?? 0,
        correctPct: row && row.n > 0 ? Math.round((row.correct / row.n) * 100) : null,
      };
    }),
    iqHistogram: Array.from({ length: (145 - 70) / 5 + 1 }, (_, i) => 70 + i * 5).map((from) => ({ from, count: iqBy.get(from) ?? 0 })),
    archetypes: ARCHETYPES.map((id) => ({ id, count: archetypeBy.get(id) ?? 0 })).sort((a, b) => b.count - a.count),
    methods: methodRows.map((r) => ({ method: r.method, count: r.n })).sort((a, b) => b.count - a.count),
    sources: sourceRows.map((r) => ({ source: r.source, count: r.n })),
    generatedAt: now.toISOString(),
  };
}
