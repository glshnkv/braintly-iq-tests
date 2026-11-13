"use client";

import { useEffect } from "react";
import type { Locale } from "@/i18n/config";
import { track } from "@/lib/client/api";

/** Fires `landing_view` once per page load. */
export function LandingTracker({ locale }: { locale: Locale }) {
  useEffect(() => {
    track("landing_view", { locale });
  }, [locale]);
  return null;
}
