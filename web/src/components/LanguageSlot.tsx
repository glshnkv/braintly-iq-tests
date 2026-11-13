import { Suspense } from "react";
import { LOCALES, type Locale } from "@/i18n/config";
import { LanguageSwitcher } from "./LanguageSwitcher";

/** Static placeholder with the same footprint, so the header doesn't shift while the switcher hydrates. */
function SwitcherPlaceholder({ locale }: { locale: Locale }) {
  return (
    <div aria-hidden className="flex rounded-full bg-ink/[0.06] p-1 text-label !tracking-[0.06em]">
      {LOCALES.map((l) => (
        <span key={l} className={`h-7 min-w-9 grid place-items-center px-2.5 rounded-full uppercase ${l === locale ? "bg-white text-ink shadow-[0_1px_2px_rgb(17_17_17/0.12)]" : "text-ink/50"}`}>
          {l}
        </span>
      ))}
    </div>
  );
}

/** The switcher reads the URL, so it streams in behind a Suspense boundary (keeps pages prerenderable). */
export function LanguageSlot({ locale, label }: { locale: Locale; label: string }) {
  return (
    <Suspense fallback={<SwitcherPlaceholder locale={locale} />}>
      <LanguageSwitcher locale={locale} label={label} />
    </Suspense>
  );
}
