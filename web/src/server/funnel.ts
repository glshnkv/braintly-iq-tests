import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { CHECKOUT, PRICING, QUIZ } from "@/config/product";
import { getDb, schema } from "@/db";
import type { SessionRow } from "@/db/schema";
import type {
  AgeGroup,
  AnswerResponse,
  CheckoutResponse,
  Expectation,
  FullResult,
  FunnelState,
  Gender,
  Praise,
  ScaleLevel,
  SessionStatus,
  SubscriptionView,
  Teaser,
} from "@/lib/api-types";
import type { Locale } from "@/i18n/config";
import { isCvcValid, isExpiryValid, isLuhnValid } from "@/lib/payments/card";
import { QUESTIONS, QUESTIONS_BY_ID } from "@/lib/quiz/questions";
import { averageScaleScores, difficultyBand, scoreAnswers } from "@/lib/quiz/scoring";
import { SCALES, type Scale } from "@/lib/quiz/types";
import { ApiError } from "./http";
import { countCompletedTests, getArchetypeRarityPct, getCohortTopPct, getCorrectRates, getSpeedPercentile } from "./stats";

const { sessions, answers, results, users, subscriptions, payments, events } = schema;

/* --------------------------------- helpers ---------------------------------- */

const STATUS_ORDER: SessionStatus[] = ["started", "completed", "lead", "paid"];
const atLeast = (status: SessionStatus, min: SessionStatus) => STATUS_ORDER.indexOf(status) >= STATUS_ORDER.indexOf(min);

async function getSession(sessionId: string): Promise<SessionRow> {
  const [row] = await getDb().select().from(sessions).where(eq(sessions.id, sessionId));
  if (!row) throw new ApiError("no_session");
  return row;
}

async function requireStatus(sessionId: string, min: SessionStatus): Promise<SessionRow> {
  const session = await getSession(sessionId);
  if (!atLeast(session.status, min)) throw new ApiError("wrong_step");
  return session;
}

export async function logEvent(sessionId: string | null, name: string, props?: Record<string, unknown>) {
  await getDb().insert(events).values({ sessionId, name, props });
}

/** Client events may arrive with a stale cookie (e.g. DB reset); attach them only to live sessions. */
export async function logClientEvent(sessionId: string | null, name: string, props?: Record<string, unknown>) {
  const [live] = sessionId
    ? await getDb().select({ id: sessions.id }).from(sessions).where(eq(sessions.id, sessionId))
    : [];
  await logEvent(live?.id ?? null, name, props);
}

const newShareId =() => randomBytes(8).toString("base64url").slice(0, 10);

function levelOf(score: number): ScaleLevel {
  if (score >= 70) return "high";
  if (score >= 40) return "mid";
  return "low";
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/* --------------------------------- session ---------------------------------- */

export async function createSession(input: {
  locale: Locale;
  utm?: { source?: string; medium?: string; campaign?: string };
  userAgent: string | null;
  country: string | null;
}): Promise<string> {
  const [row] = await getDb()
    .insert(sessions)
    .values({
      locale: input.locale,
      country: input.country,
      userAgent: input.userAgent,
      utmSource: input.utm?.source,
      utmMedium: input.utm?.medium,
      utmCampaign: input.utm?.campaign,
    })
    .returning({ id: sessions.id });
  await logEvent(row.id, "session_created", { locale: input.locale });
  return row.id;
}

export async function getFunnelState(sessionId: string): Promise<FunnelState> {
  const session = await getSession(sessionId);
  const rows = await getDb()
    .select({ questionId: answers.questionId })
    .from(answers)
    .where(eq(answers.sessionId, sessionId));
  return {
    sessionId: session.id,
    status: session.status,
    answeredIds: rows.map((r) => r.questionId),
    totalQuestions: QUESTIONS.length,
    hasProfile: session.ageGroup !== null,
  };
}

/* ---------------------------------- quiz ------------------------------------ */

function buildPraise(
  sessionAnswers: { questionId: string; isCorrect: boolean }[],
  answeredCount: number,
  rates: Map<string, number>,
): Praise {
  const blockStart = [0, ...QUIZ.praiseAfter].filter((n) => n < answeredCount).pop() ?? 0;
  const block = sessionAnswers
    .map((a) => ({ ...a, number: QUESTIONS_BY_ID.get(a.questionId)!.number }))
    .filter((a) => a.number > blockStart && a.number <= answeredCount)
    .sort((a, b) => a.number - b.number);

  const rarest = block
    .filter((a) => a.isCorrect)
    .map((a) => ({ ...a, rate: rates.get(a.questionId) ?? 100 }))
    .sort((a, b) => a.rate - b.rate)[0];
  if (rarest && rarest.rate <= 60) return { kind: "rare", pctCorrect: rarest.rate };

  let best = 0;
  let run = 0;
  for (const a of block) {
    run = a.isCorrect ? run + 1 : 0;
    best = Math.max(best, run);
  }
  if (best >= 3) return { kind: "streak", length: best };
  return { kind: "keepGoing" };
}

export async function recordAnswer(
  sessionId: string,
  input: { questionId: string; choice: number; timeMs: number },
): Promise<AnswerResponse> {
  const session = await getSession(sessionId);
  if (session.status !== "started") throw new ApiError("wrong_step");

  const { question } = QUESTIONS_BY_ID.get(input.questionId)!;
  // Idempotent: a retried request (or a double tap) never overwrites the first answer.
  await getDb()
    .insert(answers)
    .values({
      sessionId,
      questionId: input.questionId,
      choice: input.choice,
      isCorrect: question.correctIndex === input.choice,
      timeMs: input.timeMs,
    })
    .onConflictDoNothing();

  const sessionAnswers = await getDb()
    .select({ questionId: answers.questionId, isCorrect: answers.isCorrect })
    .from(answers)
    .where(eq(answers.sessionId, sessionId));
  const answeredCount = sessionAnswers.length;

  const praise = QUIZ.praiseAfter.includes(answeredCount)
    ? buildPraise(sessionAnswers, answeredCount, await getCorrectRates())
    : null;
  return { answeredCount, praise };
}

/** Saves the profile and computes the result. Safe to call twice. */
export async function completeTest(sessionId: string, input: { gender: Gender; ageGroup: AgeGroup; country: string | null }) {
  const session = await getSession(sessionId);
  const db = getDb();
  const [existing] = await db.select({ id: results.sessionId }).from(results).where(eq(results.sessionId, sessionId));
  if (existing) return;

  const rows = await db.select().from(answers).where(eq(answers.sessionId, sessionId));
  if (rows.length < QUESTIONS.length) throw new ApiError("wrong_step");

  const score = scoreAnswers(rows, await getCorrectRates());
  await db.transaction(async (tx) => {
    await tx
      .insert(results)
      .values({
        sessionId,
        shareId: newShareId(),
        iq: score.iq,
        percentile: score.percentile,
        rawScore: score.rawScore,
        archetype: score.data.archetype,
        data: score.data,
      })
      .onConflictDoNothing();
    await tx
      .update(sessions)
      .set({
        gender: input.gender,
        ageGroup: input.ageGroup,
        country: session.country ?? input.country,
        status: atLeast(session.status, "completed") ? session.status : "completed",
        completedAt: new Date(),
      })
      .where(eq(sessions.id, sessionId));
  });
  await logEvent(sessionId, "quiz_completed", { iq: score.iq, archetype: score.data.archetype });
}

export async function saveExpectation(sessionId: string, input: { expectation?: Expectation; firstTest?: boolean }) {
  await requireStatus(sessionId, "completed");
  await getDb()
    .update(sessions)
    .set({ expectation: input.expectation, firstTest: input.firstTest })
    .where(eq(sessions.id, sessionId));
}

/* ---------------------------------- lead ------------------------------------ */

export async function submitLead(sessionId: string, input: { email: string; name?: string }) {
  const session = await requireStatus(sessionId, "completed");
  const db = getDb();
  const user = await db.transaction(async (tx) => {
    const [found] = await tx.select().from(users).where(sql`lower(${users.email}) = ${input.email}`);
    const row =
      found ??
      (await tx.insert(users).values({ email: input.email, name: input.name, locale: session.locale }).returning())[0];
    if (found && input.name && input.name !== found.name) {
      await tx.update(users).set({ name: input.name }).where(eq(users.id, found.id));
    }
    await tx
      .update(sessions)
      .set({ userId: row.id, status: atLeast(session.status, "lead") ? session.status : "lead" })
      .where(eq(sessions.id, sessionId));
    return row;
  });
  await logEvent(sessionId, "lead_submitted", { returningUser: user.createdAt < session.startedAt });
}

/* -------------------------------- results ----------------------------------- */

async function loadResult(sessionId: string) {
  const [row] = await getDb()
    .select({ result: results, session: sessions, user: users })
    .from(results)
    .innerJoin(sessions, eq(sessions.id, results.sessionId))
    .leftJoin(users, eq(users.id, sessions.userId))
    .where(eq(results.sessionId, sessionId));
  if (!row) throw new ApiError("wrong_step");
  return row;
}

export async function getTeaser(sessionId: string): Promise<Teaser> {
  const { result, session, user } = await loadResult(sessionId);
  const { data } = result;
  const beaten = Math.floor(result.percentile);
  return {
    iqFirstDigit: Number(String(result.iq)[0]),
    iqDigitCount: String(result.iq).length,
    percentileFirstDigit: beaten >= 10 ? Number(String(beaten)[0]) : null,
    scales: data.scales,
    scaleLevels: Object.fromEntries(SCALES.map((s) => [s, levelOf(data.scales[s])])) as Record<Scale, ScaleLevel>,
    strongest: data.strongest,
    weakest: data.weakest,
    archetypeRarityPct: await getArchetypeRarityPct(data.archetype),
    celebrities: data.celebrities,
    achievements: data.achievements,
    cohort: { gender: session.gender, ageGroup: session.ageGroup, country: session.country },
    name: user?.name ?? null,
    totalParticipants: await countCompletedTests(),
    reportId: reportIdOf(result.shareId),
    totalTimeMs: data.totalTimeMs,
    scaleAverages: averageScaleScores(await getCorrectRates()),
  };
}

/** Human-friendly report number derived from the share id (not the share id itself). */
export function reportIdOf(shareId: string) {
  return shareId.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase();
}

function toSubscriptionView(row: typeof subscriptions.$inferSelect): SubscriptionView {
  return {
    status: row.status,
    trialEndsAt: row.trialEndsAt.toISOString(),
    priceMinor: row.priceMinor,
    currency: row.currency,
  };
}

async function getSubscription(sessionId: string) {
  const [row] = await getDb().select().from(subscriptions).where(eq(subscriptions.sessionId, sessionId));
  return row ?? null;
}

export async function getFullResult(sessionId: string): Promise<FullResult> {
  const subscription = await getSubscription(sessionId);
  if (!subscription) throw new ApiError("not_paid");

  const { result, session, user } = await loadResult(sessionId);
  const { data } = result;
  const answerRows = await getDb()
    .select()
    .from(answers)
    .where(eq(answers.sessionId, sessionId))
    .orderBy(asc(answers.createdAt));

  const cohort = await getCohortTopPct({
    iq: result.iq,
    normPercentile: result.percentile,
    gender: session.gender,
    ageGroup: session.ageGroup,
    country: session.country,
  });

  const correctRates = await getCorrectRates();

  return {
    iq: result.iq,
    percentile: result.percentile,
    scales: data.scales,
    scaleLevels: Object.fromEntries(SCALES.map((s) => [s, levelOf(data.scales[s])])) as Record<Scale, ScaleLevel>,
    scaleAverages: averageScaleScores(correctRates),
    speed: await getSpeedPercentile(data.totalTimeMs),
    strongest: data.strongest,
    weakest: data.weakest,
    archetype: data.archetype,
    archetypeRarityPct: await getArchetypeRarityPct(data.archetype),
    celebrities: data.celebrities,
    achievements: data.achievements,
    cohort: { gender: session.gender, ageGroup: session.ageGroup, country: session.country, ...cohort },
    expectation: session.expectation,
    correctCount: data.correctCount,
    totalQuestions: data.totalQuestions,
    totalTimeMs: data.totalTimeMs,
    review: answerRows
      .map((a) => {
        const { question, number } = QUESTIONS_BY_ID.get(a.questionId)!;
        return {
          number,
          questionId: a.questionId,
          scale: question.scale,
          difficulty: difficultyBand(question.difficulty),
          pctCorrect: correctRates.get(a.questionId) ?? question.expectedCorrectPct,
          choice: a.choice,
          correctIndex: question.correctIndex,
          isCorrect: a.isCorrect,
          timeMs: a.timeMs,
        };
      })
      .sort((a, b) => a.number - b.number),
    name: user?.name ?? null,
    shareId: result.shareId,
    completedAt: (session.completedAt ?? result.computedAt).toISOString(),
    subscription: toSubscriptionView(subscription),
  };
}

/** Public certificate data for a share link. Only paid results are shareable. */
export async function getCertificate(shareId: string) {
  const [row] = await getDb()
    .select({ result: results, user: users, session: sessions })
    .from(results)
    .innerJoin(sessions, eq(sessions.id, results.sessionId))
    .innerJoin(subscriptions, eq(subscriptions.sessionId, results.sessionId))
    .leftJoin(users, eq(users.id, sessions.userId))
    .where(eq(results.shareId, shareId));
  if (!row) return null;
  return {
    iq: row.result.iq,
    archetype: row.result.data.archetype,
    name: row.user?.name ?? null,
    date: (row.session.completedAt ?? row.result.computedAt).toISOString(),
  };
}

/* -------------------------------- checkout ---------------------------------- */

type CheckoutInput =
  | { method: "apple_pay" | "google_pay" }
  | { method: "card"; card: { number: string; expiry: string; cvc: string } };

export async function checkout(sessionId: string, input: CheckoutInput): Promise<CheckoutResponse> {
  const session = await requireStatus(sessionId, "lead");
  if (!session.userId) throw new ApiError("wrong_step");

  const existing = await getSubscription(sessionId);
  if (existing) return { ok: true, subscription: toSubscriptionView(existing) };

  let cardLast4: string | null = null;
  if (input.method === "card") {
    const { number, expiry, cvc } = input.card;
    if (!isLuhnValid(number) || !isExpiryValid(expiry) || !isCvcValid(cvc)) throw new ApiError("invalid_card");
    cardLast4 = number.slice(-4);
  }

  // Simulated provider round-trip.
  await new Promise((resolve) => setTimeout(resolve, CHECKOUT.processingDelayMs));

  const db = getDb();
  const declineReason = input.method === "card" ? CHECKOUT.declineCards[input.card.number] : undefined;
  if (declineReason) {
    await db.insert(payments).values({
      sessionId,
      amountMinor: PRICING.trialPriceMinor,
      currency: PRICING.currency,
      method: input.method,
      cardLast4,
      status: "failed",
      failureReason: declineReason,
    });
    await logEvent(sessionId, "payment_failed", { method: input.method, reason: declineReason });
    throw new ApiError(declineReason === "insufficient_funds" ? "insufficient_funds" : "card_declined");
  }

  const now = new Date();
  const subscription = await db.transaction(async (tx) => {
    const [sub] = await tx
      .insert(subscriptions)
      .values({
        userId: session.userId!,
        sessionId,
        plan: PRICING.plan,
        currency: PRICING.currency,
        trialPriceMinor: PRICING.trialPriceMinor,
        priceMinor: PRICING.priceMinor,
        status: "trialing",
        trialEndsAt: addDays(now, PRICING.trialDays),
      })
      .onConflictDoNothing()
      .returning();
    // A concurrent request already created it: return that one instead of charging twice.
    if (!sub) return (await tx.select().from(subscriptions).where(eq(subscriptions.sessionId, sessionId)))[0];

    await tx.insert(payments).values({
      sessionId,
      subscriptionId: sub.id,
      amountMinor: PRICING.trialPriceMinor,
      currency: PRICING.currency,
      method: input.method,
      cardLast4,
      status: "succeeded",
    });
    await tx.update(sessions).set({ status: "paid" }).where(eq(sessions.id, sessionId));
    return sub;
  });

  await logEvent(sessionId, "payment_succeeded", { method: input.method, amountMinor: PRICING.trialPriceMinor });
  return { ok: true, subscription: toSubscriptionView(subscription) };
}

export async function cancelSubscription(sessionId: string): Promise<SubscriptionView> {
  const [row] = await getDb()
    .update(subscriptions)
    .set({ status: "canceled", canceledAt: new Date() })
    .where(and(eq(subscriptions.sessionId, sessionId), sql`${subscriptions.status} <> 'canceled'`))
    .returning();
  if (row) {
    await logEvent(sessionId, "subscription_canceled");
    return toSubscriptionView(row);
  }
  const existing = await getSubscription(sessionId);
  if (!existing) throw new ApiError("not_paid");
  return toSubscriptionView(existing);
}
