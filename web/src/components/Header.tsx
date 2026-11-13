import type { Locale } from "@/i18n/config";
import { routes } from "@/lib/routes";
import { LanguageSlot } from "./LanguageSlot";
import { Logo } from "./Logo";

/** Minimal header for the funnel steps: no navigation to keep the user focused. */
export function Header({ locale, languageLabel }: { locale: Locale; languageLabel: string }) {
  return (
    <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
      <Logo href={routes.landing(locale)} />
      <LanguageSlot locale={locale} label={languageLabel} />
    </header>
  );
}
