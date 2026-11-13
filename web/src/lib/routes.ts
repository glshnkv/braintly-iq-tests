import type { Locale } from "@/i18n/config";
import type { FunnelState } from "./api-types";

export const routes = {
  landing: (l: Locale) => `/${l}`,
  test: (l: Locale) => `/${l}/test`,
  about: (l: Locale) => `/${l}/test/about`,
  analyzing: (l: Locale) => `/${l}/analyzing`,
  email: (l: Locale) => `/${l}/email`,
  paywall: (l: Locale) => `/${l}/paywall`,
  result: (l: Locale) => `/${l}/result`,
  certificate: (l: Locale, shareId: string) => `/${l}/c/${shareId}`,
};

export type Step = "test" | "about" | "analyzing" | "email" | "paywall" | "result";

/** The furthest step the user is allowed to be on, given server state. */
export function currentStep(state: FunnelState): Step {
  switch (state.status) {
    case "paid":
      return "result";
    case "lead":
      return "paywall";
    case "completed":
      return "email";
    case "started":
      return state.answeredIds.length < state.totalQuestions ? "test" : "about";
  }
}

/** Steps that may be shown for a given state (analyzing is reachable right after completion). */
export function isStepAllowed(step: Step, state: FunnelState): boolean {
  const current = currentStep(state);
  if (step === current) return true;
  return step === "analyzing" && current === "email";
}
