import { describe, expect, it } from "vitest";
import { answerSchema, checkoutSchema, leadSchema } from "./validation";

describe("request validation", () => {
  it("rejects unknown questions and out-of-range choices without throwing", () => {
    expect(answerSchema.safeParse({ questionId: "nope", choice: 0, timeMs: 10 }).success).toBe(false);
    expect(answerSchema.safeParse({ questionId: "logic-1", choice: 99, timeMs: 10 }).success).toBe(false);
    expect(answerSchema.safeParse({ questionId: "logic-1", choice: 1, timeMs: 10 }).success).toBe(true);
  });

  it("clamps absurd answer timings", () => {
    const parsed = answerSchema.parse({ questionId: "logic-1", choice: 1, timeMs: 99_999_999 });
    expect(parsed.timeMs).toBe(600_000);
  });

  it("normalizes lead emails and drops empty names", () => {
    expect(leadSchema.parse({ email: "  Anna@Example.COM ", name: "  " })).toEqual({ email: "anna@example.com", name: undefined });
    expect(leadSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
  });

  it("requires card details only for card payments", () => {
    expect(checkoutSchema.safeParse({ method: "apple_pay" }).success).toBe(true);
    expect(checkoutSchema.safeParse({ method: "card" }).success).toBe(false);
    const card = checkoutSchema.parse({ method: "card", card: { number: "4242 4242 4242 4242", expiry: "12/30", cvc: "123" } });
    expect(card.method === "card" && card.card.number).toBe("4242424242424242");
  });
});
