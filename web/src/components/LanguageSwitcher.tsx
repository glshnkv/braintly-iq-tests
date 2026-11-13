"use client";

import { usePathname, useRouter } from "next/navigation";
import { LOCALES, LOCALE_COOKIE, type Locale } from "@/i18n/config";

function rememberLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

/** Switches language while keeping the user on the same step of the funnel. */
export function LanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(next: Locale) {
    if (next === locale) return;
    rememberLocale(next);
    router.replace(pathname.replace(/^\/(ru|en)(?=\/|$)/, `/${next}`), { scroll: false });
  }

  return (
    <div role="group" aria-label={label} className="flex rounded-full bg-ink/[0.06] p-1 text-label !tracking-[0.06em]">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          aria-pressed={l === locale}
          className={`h-7 min-w-9 grid place-items-center px-2.5 rounded-full uppercase transition-colors ${
            l === locale ? "bg-white text-ink shadow-[0_1px_2px_rgb(17_17_17/0.12)]" : "text-ink/50 hover:text-ink"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
