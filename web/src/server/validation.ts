import "server-only";
import { z } from "zod";
import { LOCALES } from "@/i18n/config";
import { AGE_GROUPS } from "@/lib/api-types";
import { QUESTIONS_BY_ID } from "@/lib/quiz/questions";

const utm = z.string().trim().max(100).optional();

export const createSessionSchema = z.object({
  locale: z.enum(LOCALES),
  utm: z.object({ source: utm, medium: utm, campaign: utm }).optional(),
});

export const answerSchema = z
  .object({
    questionId: z.string(),
    choice: z.number().int().min(0),
    // Clamp absurd client timings instead of trusting them blindly.
    timeMs: z.number().int().min(0).transform((v) => Math.min(v, 10 * 60_000)),
  })
  .refine((a) => {
    const entry = QUESTIONS_BY_ID.get(a.questionId);
    return !!entry && a.choice < entry.question.options.length;
  }, "unknown question or choice out of range");

export const profileSchema = z.object({ gender: z.enum(["male", "female"]), ageGroup: z.enum(AGE_GROUPS) });

export const expectationSchema = z.object({
  expectation: z.enum(["above", "average", "below"]).optional(),
  firstTest: z.boolean().optional(),
});

export const leadSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(320)),
  name: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export const checkoutSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("apple_pay") }),
  z.object({ method: z.literal("google_pay") }),
  z.object({
    method: z.literal("card"),
    card: z.object({
      number: z.string().transform((v) => v.replace(/\s+/g, "")),
      expiry: z.string().trim(),
      cvc: z.string().trim(),
    }),
  }),
]);

export const CLIENT_EVENTS = [
  "landing_view",
  "analyzing_view",
  "email_view",
  "paywall_view",
  "paywall_cta",
  "checkout_open",
  "result_view",
  "share_click",
] as const;

export const eventSchema = z.object({
  name: z.enum(CLIENT_EVENTS),
  props: z.record(z.string(), z.union([z.string().max(200), z.number(), z.boolean()])).optional(),
});
