/**
 * Product-level configuration. Everything a PM might want to tweak or A/B test
 * lives here, so UI and business logic never hardcode these values.
 */

export const PRICING = {
  currency: "USD",
  /** Amounts are stored in minor units (cents) to avoid float errors. */
  trialPriceMinor: 100,
  trialDays: 7,
  priceMinor: 1999,
  billingPeriodDays: 30,
  plan: "monthly_v1",
} as const;

export const QUIZ = {
  /** Show an encouragement screen after these answered-question counts. */
  praiseAfter: [6, 12, 18] as readonly number[],
  /** Minimum answers on a question before observed stats replace the expected ones. */
  minAnswersForObservedStats: 30,
  /**
   * Perceived-progress curve: the bar fills by ln(1 + k·n) / ln(1 + k·N).
   * Higher k = bigger early jumps. With k = 2 and 25 questions: 28% after Q1, 61% after Q5, 94% after Q20.
   */
  progressCurve: 2,
} as const;

export const SCORING = {
  /** Points for a correct answer by difficulty (1..5). */
  difficultyWeights: { 1: 1, 2: 1.25, 3: 1.5, 4: 1.75, 5: 2 } as Record<number, number>,
  /**
   * Initial norms for the weighted raw score. Calibrated so that ~55% weighted accuracy
   * maps to IQ 100. To be recalibrated on real data once the sample is large enough.
   */
  rawMean: 19,
  rawStdDev: 6.2,
  iqMin: 70,
  iqMax: 145,
  /** If max − min scale score is below this, the profile is considered balanced. */
  balancedSpread: 15,
  /** Min cohort size for an empirical "among people like you" percentile. */
  cohortMinSize: 50,
  /** Min sample before archetype rarity is computed from real data. */
  archetypeMinSample: 100,
  /**
   * Prior for total test time until enough real results exist: log-normal around the
   * expected median. Used for "faster than X% of participants".
   */
  timeNorm: { medianMs: 12 * 60_000, logSd: 0.35, minSample: 50 },
} as const;

export const SOCIAL_PROOF = {
  /** Hide participant counts until they are large enough to be persuasive rather than off-putting. */
  minParticipantsToShow: 1000,
} as const;

export const CHECKOUT = {
  /** Simulated processing time so the payment step feels real. */
  processingDelayMs: 1200,
  /** Test cards (Stripe-like) that simulate a decline. Any other Luhn-valid card succeeds. */
  declineCards: {
    "4000000000000002": "card_declined",
    "4000000000009995": "insufficient_funds",
  } as Record<string, string>,
  demoCardNumber: "4242 4242 4242 4242",
} as const;

export const SESSION_COOKIE = {
  name: "iq_sid",
  maxAgeSeconds: 60 * 60 * 24 * 30,
} as const;
