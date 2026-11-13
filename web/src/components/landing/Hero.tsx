import Image from "next/image";
import { LanguageSlot } from "@/components/LanguageSlot";
import { Logo } from "@/components/Logo";
import { LinkButton } from "@/components/ui";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { fmt } from "@/lib/format";
import { CELEBRITIES_BY_ID } from "@/lib/quiz/celebrities";
import type { PublicQuestion } from "@/lib/quiz/types";
import { routes } from "@/lib/routes";
import { Circled } from "./doodles";
import { HeroQuiz } from "./HeroQuiz";
import { frame, NAV_KEYS, SECTION_IDS } from "./styles";

export { SECTION_IDS };

/** Hero celebrities: one below the typical score, one well above — "you" sit in between. */
const HERO_PAIR = { left: "kennedy", right: "hawking" } as const;

/* ---------------------------------- header ---------------------------------- */

export function SiteHeader({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 sm:h-[4.5rem] max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
        <Logo href={routes.landing(locale)} />
        <nav aria-label={dict.landing.nav.label} className="hidden lg:flex items-center rounded-full bg-gray-soft p-1 text-sm font-semibold">
          {NAV_KEYS.map((key) => (
            <a key={key} href={`#${SECTION_IDS[key]}`} className="h-9 rounded-full px-4 grid place-items-center text-ink/70 transition-colors hover:bg-white hover:text-ink">
              {dict.landing.nav[key]}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSlot locale={locale} label={dict.common.language} />
          <span className="hidden sm:block">
            <LinkButton href={`#${SECTION_IDS.start}`} size="sm" arrow>
              {dict.landing.cta}
            </LinkButton>
          </span>
        </div>
      </div>
    </header>
  );
}

/* ----------------------------------- hero ----------------------------------- */

/*
 * Hand-drawn IQ bar chart (public/illustrations/hero-chart.webp, transparent line art, so the
 * bars take the panel's orange). Name labels and the "average" pill are rendered in HTML on
 * top of it, so they follow the page language. Positions are % of the 1186×1088 image.
 */
const CHART = { width: 1186, height: 1088 } as const;
/** Horizontal centres of the three bars. */
const BAR_CENTERS = ["22.9%", "51.6%", "81.4%"] as const;
/** The drawn "AVERAGE IQ" pill: its right edge and vertical centre. */
const AVERAGE_PILL = { right: "2.9%", top: "90.2%", minWidth: "21%" } as const;

function IqChart({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const h = dict.landing.hero;
  const left = CELEBRITIES_BY_ID.get(HERO_PAIR.left)!;
  const right = CELEBRITIES_BY_ID.get(HERO_PAIR.right)!;
  const names = [left.name[locale], h.you, right.name[locale]];
  return (
    <figure className="relative w-full max-w-[620px] mx-auto">
      <div className="relative">
        <Image
          src="/illustrations/hero-chart.webp"
          width={CHART.width}
          height={CHART.height}
          alt={fmt(dict.landing.alt.chart, { a: left.name[locale], ai: left.iq, b: right.name[locale], bi: right.iq })}
          sizes="(min-width: 1024px) 620px, 92vw"
          priority
          className="w-full h-auto select-none"
        />
        <span
          aria-hidden
          className="absolute -translate-y-1/2 grid place-items-center rounded-full bg-ink px-2.5 sm:px-3.5 h-[22px] sm:h-[30px] text-label !text-[9.5px] sm:!text-[12px] text-orange whitespace-nowrap"
          style={AVERAGE_PILL}
        >
          {h.average}
        </span>
      </div>

      {/* X-axis labels, drawn like the chart: ink pills with a pen-weight outline */}
      <figcaption className="relative mt-2.5 h-8 sm:h-10">
        {names.map((name, i) => (
          <span
            key={name}
            className={`absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-ink px-2.5 sm:px-4 py-0.5 sm:py-1 text-[12px] sm:text-[15px] font-bold tracking-[-0.01em] ${
              i === 1 ? "bg-ink text-white" : ""
            }`}
            style={{ left: BAR_CENTERS[i] }}
          >
            {name}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/** Keeps the circled word together with the word before it, so it never dangles on its own line. */
function AccentTitle({ text, accent }: { text: string; accent: string }) {
  const words = text.split(" ");
  const last = words.pop();
  return (
    <>
      {words.join(" ")}{" "}
      <span className="whitespace-nowrap">
        {last} <Circled>{accent}</Circled>
      </span>
    </>
  );
}

interface HeroProps {
  locale: Locale;
  dict: Dictionary;
  firstQuestion: PublicQuestion;
  totalQuestions: number;
}

export function Hero({ locale, dict, firstQuestion, totalQuestions }: HeroProps) {
  const h = dict.landing.hero;
  return (
    <section id={SECTION_IDS.start} className={`${frame} scroll-mt-20 overflow-x-clip`}>
      <div className="mx-auto grid max-w-[1400px] gap-2 sm:gap-3 lg:grid-cols-[1.05fr_1fr] lg:min-h-[min(860px,calc(100svh-5.25rem))]">
        {/* Left: the first question, ready to answer */}
        <div className="stage-grid rounded-panel px-4 pt-10 pb-8 sm:px-10 sm:pt-14 sm:pb-12 flex flex-col items-center justify-center gap-8 sm:gap-10">
          <div className="text-center">
            <h1 className="text-display">
              <AccentTitle text={h.title} accent={h.titleAccent} />
            </h1>
            <p className="mt-4 text-[15px] sm:text-base font-medium text-ink/55">{h.lead}</p>
          </div>
          <HeroQuiz
            locale={locale}
            question={firstQuestion}
            total={totalQuestions}
            dict={{
              questionLabel: dict.quiz.questionLabel,
              selectOne: dict.quiz.selectOne,
              progress: dict.quiz.progress,
              close: dict.quiz.close,
              errorGeneric: dict.common.errorGeneric,
            }}
          />
        </div>

        {/* Right: orange panel with the hook */}
        <div className="relative rounded-panel bg-orange px-4 pt-8 pb-6 sm:px-10 sm:pt-12 flex flex-col">
          <div className="flex-1 grid place-items-center">
            <IqChart dict={dict} locale={locale} />
          </div>
          <p className="mt-8 text-center text-label text-ink/55 normal-case tracking-[0.02em]">{h.celebNote}</p>
        </div>
      </div>
    </section>
  );
}
