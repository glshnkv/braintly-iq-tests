import type { ReactNode } from "react";
import { CelebLadder, Distribution, IqBandScale, ProfileRadar, type LadderRow } from "@/components/report/charts";
import { LegalLink, LegalText } from "@/components/legal/LegalLink";
import { Logo } from "@/components/Logo";
import { COPYRIGHT_YEAR, FOOTER_DOCS } from "@/config/legal";
import { LinkButton, MonoLabel } from "@/components/ui";
import { TYPE_ILLUSTRATION, type IllustrationId } from "@/config/illustrations";
import { PRICING } from "@/config/product";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { fmt, formatMoney } from "@/lib/format";
import { CELEBRITIES_BY_ID } from "@/lib/quiz/celebrities";
import { normalCdf } from "@/lib/quiz/normal";
import { ARCHETYPES } from "@/lib/quiz/result-types";
import type { Scale } from "@/lib/quiz/types";
import { routes } from "@/lib/routes";
import { Circled, HandArrow } from "./doodles";
import { Illustration } from "./Illustration";
import { container, frame, NAV_KEYS, SECTION_IDS } from "./styles";

type Props = { locale: Locale; dict: Dictionary };

/** Editorial header: title on the left, the supporting line on the right. */
function SectionHeading({ title, subtitle }: { title: ReactNode; subtitle?: string }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-end">
      <h2 className="text-section max-w-[15ch] text-balance">{title}</h2>
      {subtitle && <p className="max-w-md text-[17px] leading-relaxed text-ink/60 lg:justify-self-end lg:pb-1.5">{subtitle}</p>}
    </div>
  );
}

/** Circles the last word of a heading in any language. */
function accentLastWord(title: string) {
  const words = title.split(" ");
  const last = words.pop();
  return (
    <>
      {words.join(" ")} <Circled>{last}</Circled>
    </>
  );
}

function priceVars(locale: Locale) {
  return {
    trial: formatMoney(PRICING.trialPriceMinor, PRICING.currency, locale),
    price: formatMoney(PRICING.priceMinor, PRICING.currency, locale),
    days: PRICING.trialDays,
  };
}

/* --------------------------------- how it works -------------------------------- */

const STEP_ILLUSTRATIONS: IllustrationId[] = ["step-solve", "step-profile", "step-certificate"];

export function HowItWorks({ dict }: Props) {
  const how = dict.landing.how;
  return (
    <section id={SECTION_IDS.how} className={`${container} py-20 md:py-32`}>
      <SectionHeading title={accentLastWord(how.title)} />
      <ol className="mt-14 grid gap-3 md:grid-cols-3">
        {how.steps.map((step, i) => (
          <li key={step.title} className="flex flex-col rounded-panel bg-gray-soft p-2.5">
            <div className="relative aspect-[4/3] rounded-[30px] bg-white">
              <Illustration id={STEP_ILLUSTRATIONS[i]} alt={dict.landing.alt.steps[i]} sizes="(min-width: 768px) 33vw, 100vw" className="p-6" />
            </div>
            <div className="flex flex-col gap-2 px-4 pt-6 pb-5">
              <h3 className="text-[1.375rem] font-bold tracking-[-0.025em]">{step.title}</h3>
              <p className="text-ink/60 leading-relaxed">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------------------------------- inside ------------------------------------- */

const SCALE_LAYOUT: { scale: Scale; span: string }[] = [
  { scale: "patterns", span: "md:col-span-3" },
  { scale: "logic", span: "md:col-span-3" },
  { scale: "numbers", span: "md:col-span-2" },
  { scale: "spatial", span: "md:col-span-2" },
  { scale: "memory", span: "md:col-span-2" },
];

export function InsideTest({ dict }: Props) {
  const inside = dict.landing.inside;
  return (
    <section id={SECTION_IDS.inside} className={frame}>
      <div className="mx-auto max-w-[1400px] stage-grid rounded-panel">
        <div className={`${container} py-20 md:py-28`}>
          <SectionHeading title={accentLastWord(inside.title)} subtitle={inside.subtitle} />
          <div className="mt-14 grid gap-3 md:grid-cols-6">
            {SCALE_LAYOUT.map(({ scale, span }) => (
              <article key={scale} className={`rounded-card bg-white ${span} p-7 sm:p-8 flex flex-col gap-8 justify-between min-h-56`}>
                <h3 className="text-[1.75rem] sm:text-[2rem] font-extrabold tracking-[-0.04em] leading-none">{dict.scales[scale]}</h3>
                <p className="text-[17px] text-ink/60 leading-relaxed max-w-md">{dict.scaleDescriptions[scale]}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------- types -------------------------------------- */


export function ThinkingTypes({ dict }: Props) {
  const types = dict.landing.types;
  return (
    <section id={SECTION_IDS.types} className={`${container} py-20 md:py-32`}>
      <SectionHeading title={accentLastWord(types.title)} subtitle={types.subtitle} />
      <ul className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-10 md:gap-x-4">
        {ARCHETYPES.map((id) => (
          <li key={id} className="flex flex-col gap-5">
            <div className="relative aspect-square overflow-hidden rounded-card bg-gray-soft">
              <div className="absolute inset-0">
                <Illustration id={TYPE_ILLUSTRATION[id]} alt={dict.archetypes[id].name} sizes="(min-width: 1024px) 25vw, 50vw" className="p-5 sm:p-7" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5 px-1">
              <h3 className="text-lg sm:text-xl font-bold tracking-[-0.025em]">{dict.archetypes[id].name}</h3>
              <p className="text-sm sm:text-[15px] text-ink/55 leading-relaxed">{dict.archetypes[id].description}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------------------------- report ------------------------------------- */

const SAMPLE_SCALES: Record<Scale, number> = { logic: 82, numbers: 64, patterns: 91, spatial: 58, memory: 70 };
const SAMPLE_AVERAGES: Record<Scale, number> = { logic: 55, numbers: 52, patterns: 50, spatial: 54, memory: 57 };
const SAMPLE_IQ = 118;
const SAMPLE_PERCENTILE = Math.floor(normalCdf((SAMPLE_IQ - 100) / 15) * 100);

/**
 * A sample of the real report, built from the same components: the main sheet plus two
 * fragments (profile, IQ ladder) floating around it like pages pulled out of the file.
 */
function SampleReport({ locale, dict }: Props) {
  const rp = dict.report;
  const kennedy = CELEBRITIES_BY_ID.get("kennedy")!;
  const hawking = CELEBRITIES_BY_ID.get("hawking")!;
  const ladder: LadderRow[] = [
    { kind: "celeb", id: hawking.id, name: hawking.name[locale], role: hawking.role[locale], iq: hawking.iq },
    { kind: "celeb", id: kennedy.id, name: kennedy.name[locale], role: kennedy.role[locale], iq: kennedy.iq },
    { kind: "you", name: rp.you, iq: SAMPLE_IQ },
    { kind: "average", name: rp.averagePerson, role: rp.averageRole, iq: 100 },
  ];
  return (
    <div className="relative w-full max-w-[360px]">
      {/* Main sheet */}
      <div className="relative -rotate-[1.5deg] rounded-card bg-white p-6 shadow-float">
        <div className="flex items-start justify-between gap-3">
          <div>
            <MonoLabel muted>{rp.preparedFor}</MonoLabel>
            <p className="mt-1 text-[17px] font-bold tracking-[-0.02em]">{dict.landing.report.sampleName}</p>
          </div>
          <span className="rounded-full bg-gray-soft px-2.5 py-1 text-[11.5px] font-semibold">{dict.landing.report.sampleLabel}</span>
        </div>

        <div className="mt-6 flex items-end justify-between gap-3">
          <div>
            <MonoLabel muted>{rp.iqLabel}</MonoLabel>
            <p className="mt-1 text-[5.25rem] font-extrabold leading-[0.85] tracking-[-0.06em]">{SAMPLE_IQ}</p>
          </div>
          <span className="mb-1 rounded-full bg-ink px-3 py-1.5 text-[12.5px] font-semibold text-white">{rp.bands.aboveAverage}</span>
        </div>
        <div className="mt-2">
          <IqBandScale iq={SAMPLE_IQ} labels={rp.bands} legend={false} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-1.5">
          <div className="rounded-control bg-ink p-3.5 text-white">
            <p className="text-[1.6rem] font-extrabold leading-none tracking-[-0.05em]">{SAMPLE_PERCENTILE}%</p>
            <p className="mt-2 text-[11.5px] font-semibold leading-snug text-white/65">{rp.factBeat}</p>
          </div>
          <div className="rounded-control bg-gray-soft p-3.5">
            <p className="text-[1.6rem] font-extrabold leading-none tracking-[-0.05em]">
              {fmt(rp.factOneIn, { n: Math.round(100 / (100 - SAMPLE_PERCENTILE)) })}
            </p>
            <p className="mt-2 text-[11.5px] font-semibold leading-snug text-ink/55">{rp.factOneInCaption}</p>
          </div>
        </div>

        <div className="mt-5">
          <Distribution iq={SAMPLE_IQ} youLabel={rp.you} />
        </div>

        <div className="mt-3 flex items-center gap-3.5 rounded-tile bg-gray-soft p-2.5 pr-4">
          <div className="relative size-14 shrink-0 rounded-[14px] bg-white">
            <Illustration id="type-strategist" alt="" sizes="56px" className="p-1" />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-ink/45">{rp.archetypeTitle}</p>
            <p className="text-lg font-extrabold leading-tight tracking-[-0.03em]">{dict.archetypes.strategist.name}</p>
          </div>
          <span className="ml-auto text-[12px] font-semibold text-orange">12%</span>
        </div>
      </div>

      {/* Fragment: IQ ladder */}
      {/* Fragment: profile against the average */}
      <div className="absolute -right-[150px] top-[232px] z-10 hidden w-52 rotate-[5deg] rounded-card bg-white p-4 shadow-float sm:block lg:hidden xl:block">
        <p className="px-1 text-[13px] font-bold tracking-[-0.01em]">{rp.profileTitle}</p>
        <ProfileRadar scales={SAMPLE_SCALES} averages={SAMPLE_AVERAGES} labels={dict.scales} />
      </div>

      <div className="absolute -left-[170px] bottom-[52px] z-10 hidden w-56 -rotate-[4deg] rounded-card bg-white p-2.5 shadow-float sm:block lg:hidden xl:block">
        <p className="px-2.5 pt-1.5 pb-2 text-[13px] font-bold leading-tight tracking-[-0.01em]">{rp.ladderTitle}</p>
        <CelebLadder rows={ladder} compact />
      </div>
    </div>
  );
}

/** Mirrors the hero split: orange panel with the sample report, gray panel with the copy. */
export function ReportPreview({ locale, dict }: Props) {
  const r = dict.landing.report;
  return (
    <section className={frame}>
      <div className="mx-auto grid max-w-[1400px] gap-2 sm:gap-3 lg:grid-cols-2">
        <div className="relative grid place-items-center overflow-hidden rounded-panel bg-orange px-5 py-14 sm:py-20 xl:py-24">
          <SampleReport locale={locale} dict={dict} />
        </div>

        <div className="stage-grid rounded-panel px-6 py-16 md:px-14 md:py-24 flex flex-col justify-center gap-12">
          <h2 className="text-section max-w-[14ch] text-balance">{r.title}</h2>
          <ul className="grid sm:grid-cols-2 gap-2">
            {r.items.map((item) => (
              <li key={item.title} className="rounded-tile bg-white/70 p-5 flex flex-col gap-2">
                <h3 className="font-bold text-lg leading-snug tracking-[-0.02em]">{item.title}</h3>
                <p className="text-ink/60 text-[15px] leading-relaxed">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------- honest ------------------------------------- */

/** 25 answers: filled = correct. A fixed pattern — it only illustrates the idea. */
const ANSWER_PATTERN = "1101111011101101111101110";

function HonestVisual({ index, locale, dict }: { index: number; locale: Locale; dict: Dictionary }) {
  const vars = priceVars(locale);
  switch (index) {
    case 0:
      return (
        <div className="flex items-center gap-4">
          <div className="grid grid-cols-5 gap-1.5">
            {[...ANSWER_PATTERN].map((c, i) => (
              <span key={i} className={`size-3.5 rounded-[5px] ${c === "1" ? "bg-ink" : "bg-orange-soft"}`} />
            ))}
          </div>
          <HandArrow className="w-12 -rotate-[20deg] text-orange" />
          <span className="text-5xl font-extrabold tracking-[-0.05em]">{SAMPLE_IQ}</span>
        </div>
      );
    case 1:
      return (
        <div className="flex flex-col items-center gap-2">
          <span className="text-5xl font-extrabold tracking-[-0.05em]">{vars.trial}</span>
          <span className="text-label text-ink/50">{fmt(dict.landing.honest.priceThen, vars)}</span>
        </div>
      );
    default:
      return (
        <div className="relative">
          <span className="inline-flex h-11 items-center rounded-full bg-gray-soft px-5 text-sm font-semibold">{dict.result.cancel}</span>
          <svg aria-hidden viewBox="0 0 24 24" className="absolute -right-3 top-6 size-7 drop-shadow-[0_2px_3px_rgb(17_17_17/0.2)]">
            <path d="M5 3l14 8-6 1.6L10 19z" fill="var(--ink)" stroke="white" strokeWidth={1.5} strokeLinejoin="round" />
          </svg>
        </div>
      );
  }
}

export function Honest({ locale, dict }: Props) {
  const h = dict.landing.honest;
  const vars = priceVars(locale);
  return (
    <section className={`${container} py-20 md:py-32`}>
      <SectionHeading title={accentLastWord(h.title)} />
      <ul className="mt-14 grid gap-3 md:grid-cols-3">
        {h.items.map((item, i) => (
          <li key={item.title} className="rounded-panel bg-gray-soft p-2.5 flex flex-col">
            <div className="grid h-44 place-items-center rounded-[30px] bg-white">
              <HonestVisual index={i} locale={locale} dict={dict} />
            </div>
            <div className="flex flex-col gap-2 px-4 pt-6 pb-5">
              <h3 className="text-[1.375rem] font-bold tracking-[-0.025em]">{item.title}</h3>
              <p className="text-ink/60 leading-relaxed">{fmt(item.text, vars)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ----------------------------------- faq --------------------------------------- */

export function Faq({ locale, dict }: Props) {
  const faq = dict.landing.faq;
  const vars = priceVars(locale);
  return (
    <section id={SECTION_IDS.faq} className={`${container} pb-20 md:pb-32 grid gap-12 lg:grid-cols-[1fr_1.55fr]`}>
      <div className="lg:sticky lg:top-28 lg:self-start">
        <SectionHeading title={faq.title} />
      </div>
      <div className="flex flex-col gap-2">
        {faq.items.map((item) => (
          <details key={item.q} className="group rounded-tile bg-gray-soft transition-colors open:bg-gray">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 px-6 py-5 text-lg font-bold tracking-[-0.02em] [&::-webkit-details-marker]:hidden">
              {item.q}
              <span
                aria-hidden
                className="grid place-items-center size-9 shrink-0 rounded-full bg-white transition-transform duration-300 group-open:rotate-45"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
            </summary>
            <p className="px-6 pb-6 pr-16 -mt-1 text-ink/65 leading-relaxed">{fmt(item.a, vars)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------- final -------------------------------------- */

/** Closes the page with the same split as the hero. */
export function FinalCta({ dict }: Props) {
  const f = dict.landing.final;
  return (
    <section className={frame}>
      <div className="mx-auto grid max-w-[1400px] gap-2 sm:gap-3 lg:grid-cols-2">
        <div className="stage-grid rounded-panel px-6 py-16 md:px-14 md:py-24 flex flex-col justify-center items-start gap-6">
          <h2 className="text-section max-w-[12ch]">{accentLastWord(f.title)}</h2>
          <p className="text-[17px] text-ink/60 max-w-sm leading-relaxed">{f.subtitle}</p>
          <LinkButton href={`#${SECTION_IDS.start}`} size="lg" arrow className="mt-2">
            {f.cta}
          </LinkButton>
        </div>
        {/* The crowd is cropped at the bottom, so it rises straight out of the panel's lower edge. */}
        <div className="relative overflow-hidden rounded-panel bg-orange px-5 md:px-10 pt-14 md:pt-20 flex items-end">
          <div className="relative aspect-[1400/868] w-full max-w-[600px] mx-auto">
            <Illustration id="final-crowd" alt={dict.landing.alt.crowd} sizes="(min-width: 1024px) 45vw, 100vw" className="object-bottom" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer({ locale, dict }: Props) {
  return (
    <footer className={`${container} pt-20 pb-10`}>
      <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-4 max-w-xs">
          <Logo href={routes.landing(locale)} />
          <p className="text-[15px] text-ink/55 leading-relaxed">{dict.landing.footer}</p>
        </div>
        <nav aria-label={dict.landing.nav.label} className="grid grid-cols-2 gap-x-12 gap-y-3 text-[15px] font-semibold">
          {NAV_KEYS.map((key) => (
            <a key={key} href={`#${SECTION_IDS[key]}`} className="text-ink/70 hover:text-ink transition-colors">
              {dict.landing.nav[key]}
            </a>
          ))}
        </nav>
      </div>
      <div className="mt-14 border-t border-ink/[0.08] pt-8 flex flex-col gap-6">
        <nav aria-label={dict.legal.docsLabel}>
          <ul className="flex flex-wrap gap-x-6 gap-y-2.5 text-[14px] font-semibold text-ink/55">
            {FOOTER_DOCS.map((doc) => (
              <li key={doc}>
                <LegalLink doc={doc} plain className="hover:text-ink">
                  {dict.legal.docs[doc]}
                </LegalLink>
              </li>
            ))}
          </ul>
        </nav>
        <p className="max-w-3xl text-[13px] leading-relaxed text-ink/45">
          <LegalText template={dict.legal.footerNote} labels={dict.legal.footerNoteLabels} />
        </p>
        <p className="text-label normal-case tracking-[0.02em] text-ink/40">{fmt(dict.legal.rights, { year: COPYRIGHT_YEAR })}</p>
      </div>
    </footer>
  );
}
