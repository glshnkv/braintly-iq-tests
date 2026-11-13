"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { FunnelState } from "@/lib/api-types";
import { currentStep, isStepAllowed, routes, type Step } from "@/lib/routes";
import { api, ClientApiError } from "./api";

type GuardState =
  | { status: "loading" }
  | { status: "ready"; state: FunnelState }
  | { status: "error"; retry: () => void };

/**
 * Loads the funnel state and redirects if the user isn't allowed on `step`
 * (no session → landing; wrong step → the step they should be on).
 * Re-checks every time the page becomes visible again.
 */
export function useFunnelGuard(step: Step, locale: Locale): GuardState {
  const router = useRouter();
  const [guard, setGuard] = useState<GuardState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  // Pages are kept alive (hidden) between navigations. When this one is hidden, forget the
  // state so a return visit re-checks the server instead of showing a stale step or session.
  useLayoutEffect(() => {
    return () => setGuard({ status: "loading" });
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .getState()
      .then((state) => {
        if (cancelled) return;
        if (isStepAllowed(step, state)) setGuard({ status: "ready", state });
        else router.replace(routes[currentStep(state)](locale));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ClientApiError && err.code === "no_session") router.replace(routes.landing(locale));
        else setGuard({ status: "error", retry: () => setAttempt((n) => n + 1) });
      });
    return () => {
      cancelled = true;
    };
  }, [step, locale, router, attempt]);

  return guard;
}
