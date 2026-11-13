"use client";

import type {
  AgeGroup,
  AnswerResponse,
  ApiErrorCode,
  CheckoutResponse,
  Expectation,
  FullResult,
  FunnelState,
  Gender,
  PaymentMethod,
  SubscriptionView,
  Teaser,
} from "@/lib/api-types";
import type { Locale } from "@/i18n/config";

export class ClientApiError extends Error {
  constructor(public readonly code: ApiErrorCode | "network") {
    super(code);
  }
}

async function request<T>(path: string, init?: { method?: "GET" | "POST"; body?: unknown }): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: init?.method ?? "GET",
      headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ClientApiError("network");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ClientApiError((data?.error as ApiErrorCode | undefined) ?? "internal");
  return data as T;
}

const post = <T>(path: string, body: unknown = {}) => request<T>(path, { method: "POST", body });

export const api = {
  startSession: (body: { locale: Locale; utm?: Record<string, string> }) => post("/api/session", body),
  getState: () => request<FunnelState>("/api/session"),
  answer: (body: { questionId: string; choice: number; timeMs: number }) => post<AnswerResponse>("/api/answers", body),
  saveProfile: (body: { gender: Gender; ageGroup: AgeGroup }) => post("/api/profile", body),
  saveExpectation: (body: { expectation?: Expectation; firstTest?: boolean }) => post("/api/expectation", body),
  getTeaser: () => request<Teaser>("/api/teaser"),
  submitLead: (body: { email: string; name?: string }) => post("/api/lead", body),
  checkout: (
    body: { method: Exclude<PaymentMethod, "card"> } | { method: "card"; card: { number: string; expiry: string; cvc: string } },
  ) => post<CheckoutResponse>("/api/checkout", body),
  getResult: () => request<FullResult>("/api/result"),
  cancelSubscription: () => post<SubscriptionView>("/api/subscription/cancel"),
};

/** Fire-and-forget analytics. Never blocks or breaks the UI. */
export function track(name: string, props?: Record<string, string | number | boolean>) {
  const body = JSON.stringify({ name, props });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
      return;
    }
  } catch {
    // fall through to fetch
  }
  void fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(
    () => undefined,
  );
}
