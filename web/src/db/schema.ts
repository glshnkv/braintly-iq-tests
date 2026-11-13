import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { ResultData } from "@/lib/quiz/result-types";

export const genderEnum = pgEnum("gender", ["male", "female"]);
export const ageGroupEnum = pgEnum("age_group", ["18-24", "25-34", "35-44", "45-54", "55+"]);
export const sessionStatusEnum = pgEnum("session_status", ["started", "completed", "lead", "paid"]);
export const expectationEnum = pgEnum("expectation", ["above", "average", "below"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["trialing", "active", "canceled"]);
export const paymentMethodEnum = pgEnum("payment_method", ["apple_pay", "google_pay", "card"]);
export const paymentStatusEnum = pgEnum("payment_status", ["succeeded", "failed"]);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 80 }),
  locale: varchar("locale", { length: 8 }).notNull(),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("users_email_idx").on(sql`lower(${t.email})`)]);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  locale: varchar("locale", { length: 8 }).notNull(),
  /** Asked at the end of the test, so null while the test is in progress. */
  gender: genderEnum("gender"),
  ageGroup: ageGroupEnum("age_group"),
  country: varchar("country", { length: 2 }),
  expectation: expectationEnum("expectation"),
  firstTest: boolean("first_test"),
  status: sessionStatusEnum("status").notNull().default("started"),
  utmSource: varchar("utm_source", { length: 100 }),
  utmMedium: varchar("utm_medium", { length: 100 }),
  utmCampaign: varchar("utm_campaign", { length: 100 }),
  userAgent: text("user_agent"),
  startedAt: createdAt(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (t) => [index("sessions_status_idx").on(t.status), index("sessions_started_idx").on(t.startedAt)]);

export const answers = pgTable("answers", {
  sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  questionId: varchar("question_id", { length: 32 }).notNull(),
  choice: smallint("choice").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  timeMs: integer("time_ms").notNull(),
  createdAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.sessionId, t.questionId] }), index("answers_question_idx").on(t.questionId)]);

export const results = pgTable("results", {
  sessionId: uuid("session_id").primaryKey().references(() => sessions.id, { onDelete: "cascade" }),
  shareId: varchar("share_id", { length: 16 }).notNull().unique(),
  iq: smallint("iq").notNull(),
  percentile: real("percentile").notNull(),
  rawScore: doublePrecision("raw_score").notNull(),
  archetype: varchar("archetype", { length: 32 }).notNull(),
  data: jsonb("data").$type<ResultData>().notNull(),
  computedAt: createdAt(),
}, (t) => [index("results_archetype_idx").on(t.archetype)]);

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  sessionId: uuid("session_id").notNull().references(() => sessions.id).unique(),
  plan: varchar("plan", { length: 32 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  trialPriceMinor: integer("trial_price_minor").notNull(),
  priceMinor: integer("price_minor").notNull(),
  status: subscriptionStatusEnum("status").notNull(),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }).notNull(),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => sessions.id),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
  amountMinor: integer("amount_minor").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  method: paymentMethodEnum("method").notNull(),
  cardLast4: varchar("card_last4", { length: 4 }),
  status: paymentStatusEnum("status").notNull(),
  failureReason: varchar("failure_reason", { length: 64 }),
  createdAt: createdAt(),
}, (t) => [index("payments_session_idx").on(t.sessionId)]);

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 48 }).notNull(),
  props: jsonb("props").$type<Record<string, unknown>>(),
  createdAt: createdAt(),
}, (t) => [index("events_name_idx").on(t.name, t.createdAt), index("events_session_idx").on(t.sessionId)]);

export type SessionRow = typeof sessions.$inferSelect;
export type ResultRow = typeof results.$inferSelect;
