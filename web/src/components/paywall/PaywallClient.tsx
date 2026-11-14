"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Illustration } from "@/components/landing/Illustration";
import { LegalText } from "@/components/legal/LegalLink";
import {
  CelebLadder,
  DifficultyRings,
  Distribution,
  Legend,
  PeopleGrid,
  ProfileRadar,
  ScaleComparison,
  approxIqFromTeaser,
  type LadderRow,
} from "@/components/report/charts";
import {
  AchievementList,
  BlurValue,
  CertificateCard,
  LockBadge,
  Locked,
  REPORT_GRID,
  MethodStrip,
  RarityDots,
  ReportCard,
  ReportCover,
} from "@/components/report/ReportPieces";
import { Button, CheckIcon, LockIcon, MonoLabel, Spinner, ErrorBox } from "@/components/ui";
import { PRICING, SOCIAL_PROOF } from "@/config/product";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { DifficultyBand, ScaleLevel, Teaser } from "@/lib/api-types";
import { api, track } from "@/lib/client/api";
import { useFunnelGuard } from "@/lib/client/use-funnel-guard";
import { achievementText, cohortText } from "@/lib/copy";
import { fmt, formatDate, formatMoney, formatNumber } from "@/lib/format";
import { CELEBRITIES, CELEBRITIES_BY_ID } from "@/lib/quiz/celebrities";
import type { Scale } from "@/lib/quiz/types";
import { routes } from "@/lib/routes";
import { CheckoutSheet } from "./CheckoutSheet";

interface Props {
  locale: Locale;
  dict: Dictionary;
}

/*
 * PLACEHOLDER data for the blurred previews. The real values are computed on the server and
 * only sent after payment — the blur hides made-up numbers, never the user's own.
 */
const PH_SCALES: Record<Scale, number> = { logic: 74, numbers: 58, patterns: 81, spatial: 46, memory: 63 };
const PH_LEVELS: Record<Scale, ScaleLevel> = { logic: "high", numbers: "mid", patterns: "high", spatial: "mid", memory: "mid" };
const PH_AVERAGES: Record<Scale, number> = { logic: 55, numbers: 52, patterns: 50, spatial: 54, memory: 57 };
const PH_REVIEW: { difficulty: DifficultyBand; isCorrect: boolean }[] = [
  ...Array.from({ length: 8 }, (_, i) => ({ difficulty: "easy" as const, isCorrect: i < 7 })),
  ...Array.from({ length: 9 }, (_, i) => ({ difficulty: "medium" as const, isCorrect: i < 6 })),
  ...Array.from({ length: 8 }, (_, i) => ({ difficulty: "hard" as const, isCorrect: i < 3 })),
];

function Arrow({ up }: { up: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={`size-3.5 ${up ? "" : "rotate-180"}`} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}

function formatDuration(ms: number) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function PaywallClient({ locale, dict }: Props) {
  const router = useRouter();
  const guard = useFunnelGuard("paywall", locale);
  const [data, setData] = useState<{ teaser: Teaser; firstChargeDate: Date } | null>(null);
  const [failed, setFailed] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  const heroCta = useRef<HTMLDivElement>(null);
  const finalCta = useRef<HTMLDivElement>(null);

  // Close the checkout sheet when the page is hidden, so it isn't open on a return visit.
  useLayoutEffect(() => {
    return () => {
      setCheckoutOpen(false);
      setStickyVisible(false);
    };
  }, []);

  useEffect(() => {
    if (guard.status !== "ready") return;
    track("paywall_view");
    api.getTeaser().then(
      // The first-charge date is fixed when the offer is shown, matching what the server will set at checkout.
      (teaser) => setData({ teaser, firstChargeDate: new Date(Date.now() + PRICING.trialDays * 86_400_000) }),
      () => setFailed(true),
    );
  }, [guard.status]);

  // The floating pay button appears only while neither in-page CTA is on screen.
  useEffect(() => {
    if (!data) return;
    const visible = new Map<Element, boolean>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) visible.set(e.target, e.isIntersecting);
      setStickyVisible(![...visible.values()].some(Boolean));
    });
    for (const el of [heroCta.current, finalCta.current]) if (el) io.observe(el);
    return () => io.disconnect();
  }, [data]);

  const closeCheckout = useCallback(() => setCheckoutOpen(false), []);

  if (guard.status === "error" || failed)
    return <ErrorBox message={dict.common.errorNetwork} onRetry={() => window.location.reload()} retryLabel={dict.common.retry} />;
  if (guard.status === "loading" || !data) return <Spinner label={dict.common.loading} />;

  const { teaser, firstChargeDate } = data;
  const p = dict.paywall;
  const rp = dict.report;
  const trialPrice = formatMoney(PRICING.trialPriceMinor, PRICING.currency, locale);
  const fullPrice = formatMoney(PRICING.priceMinor, PRICING.currency, locale);
  const aboveHundred = teaser.iqDigitCount === 3;
  const ctaLabel = fmt(p.cta, { price: trialPrice });
  const terms = fmt(p.terms, { days: PRICING.trialDays, trial: trialPrice, price: fullPrice, date: formatDate(firstChargeDate, locale) });
  const legalNote = <LegalText template={dict.legal.paywall.text} labels={dict.legal.paywall.labels} />;
  const hiddenDigits = "?".repeat(teaser.iqDigitCount - 1);
  const lockedIq = (
    <>
      {teaser.iqFirstDigit}
      <BlurValue>{hiddenDigits}</BlurValue>
    </>
  );

  // The user's honest range on the ladder: between the two famous neighbours, narrowed by the visible first digit.
  const below = teaser.celebrities.below ? CELEBRITIES_BY_ID.get(teaser.celebrities.below) : undefined;
  const above = teaser.celebrities.above ? CELEBRITIES_BY_ID.get(teaser.celebrities.above) : undefined;
  const digitRange: [number, number] =
    teaser.iqDigitCount === 3 ? [100, 199] : [teaser.iqFirstDigit * 10, teaser.iqFirstDigit * 10 + 9];
  const youRange: [number, number] = [Math.max(below?.iq ?? 60, digitRange[0]), Math.min(above?.iq ?? 165, digitRange[1])];
  const ladder: LadderRow[] = [
    ...CELEBRITIES.map((c) => ({ kind: "celeb" as const, id: c.id, name: c.name[locale], role: c.role[locale], iq: c.iq })),
    { kind: "average", name: rp.averagePerson, role: rp.averageRole, iq: 100 },
    { kind: "you", name: rp.you, iq: null, range: youRange },
  ];

  // Third row on desktop: archetype, achievements and cohort share it equally.
  const rowCount = 1 + (teaser.achievements.length > 0 ? 1 : 0) + (teaser.cohort.ageGroup ? 1 : 0);
  const rowSpan = rowCount === 3 ? "lg:col-span-4" : rowCount === 2 ? "lg:col-span-6" : "lg:col-span-12";

  function openCheckout() {
    track("paywall_cta");
    setCheckoutOpen(true);
  }

  return (
    <div className={`${REPORT_GRID} pt-2 sm:pt-6`}>
      {/* 0. Cover: the report exists, the score is behind the lock */}
      <section className="rounded-card bg-white p-6 sm:p-8 animate-fade-up lg:col-span-7">
        <ReportCover
          preparedFor={rp.preparedFor}
          name={teaser.name}
          date={formatDate(new Date(), locale)}
          status={
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-soft px-2.5 py-1 text-[12px] font-semibold">
              <span className="size-1.5 rounded-full bg-orange animate-pulse" />
              {rp.ready}
            </span>
          }
        />

        <div className="mt-9 text-center">
          <MonoLabel muted>{rp.iqLabel}</MonoLabel>
          <p className="relative mt-4 inline-flex text-[8.5rem] sm:text-[10rem] font-extrabold leading-[0.8] tracking-[-0.07em]" aria-label="IQ">
            {lockedIq}
            <LockBadge className="absolute -right-4 -top-2 size-10 shadow-lift" />
          </p>
          <p className="mx-auto mt-7 max-w-sm text-lg font-semibold leading-snug tracking-[-0.015em] text-balance">
            {aboveHundred ? p.aboveAverage : p.belowHundred}
          </p>
        </div>

        <div className="mt-8">
          <MethodStrip
            items={[
              { value: 25, label: rp.stats.questions },
              { value: 5, label: rp.stats.scales },
              { value: formatDuration(teaser.totalTimeMs), label: rp.stats.time },
              teaser.totalParticipants >= SOCIAL_PROOF.minParticipantsToShow
                ? { value: formatNumber(teaser.totalParticipants, locale), label: rp.stats.base }
                : { value: 8, label: rp.stats.types },
            ]}
          />
        </div>

        <div ref={heroCta} className="mt-6 flex flex-col gap-3">
          <Button variant="accent" arrow onClick={openCheckout}>
            {ctaLabel}
          </Button>
          <p className="text-center text-[12.5px] font-medium leading-relaxed text-ink/45 text-balance">{terms}</p>
          <p className="text-center text-[11.5px] font-medium leading-relaxed text-ink/40 text-pretty">{legalNote}</p>
        </div>
      </section>

      {/* 1. Where you stand: the zone is honest, the exact share is locked */}
      <ReportCard title={rp.distributionTitle} meta="σ = 15" className="lg:col-span-5">
        <Distribution iq={approxIqFromTeaser(teaser.iqFirstDigit, teaser.iqDigitCount, teaser.percentileFirstDigit)} masked youLabel={rp.you} />
        <p className="mt-5 text-[1.6rem] font-bold leading-tight tracking-[-0.035em]">
          {teaser.percentileFirstDigit !== null ? (
            <>
              {p.beatPrefix}{" "}
              <span className="text-orange">
                {teaser.percentileFirstDigit}
                <BlurValue>?</BlurValue>
              </span>
              {p.beatSuffix}
            </>
          ) : (
            p.beatUnknown
          )}
        </p>
        <p className="mt-2 text-[13px] font-medium text-ink/45">{rp.distributionNote}</p>

        <div className="mt-7 rounded-tile bg-gray-soft p-4 sm:p-5">
          <p className="mb-4 text-[15px] font-bold tracking-[-0.01em]">{rp.peopleTitle}</p>
          <Locked label={rp.locked}>
            <div className="max-h-44 overflow-hidden p-1">
              <PeopleGrid percentile={63} />
            </div>
          </Locked>
        </div>
      </ReportCard>

      {/* 2. The ladder of famous people with the user's honest range */}
      <ReportCard title={rp.ladderTitle} className="lg:col-span-5">
        <CelebLadder rows={ladder} lockedValue={lockedIq} />
        <p className="mt-5 text-[15px] font-semibold leading-snug">{rp.ladderTeaser}</p>
        <p className="mt-2 text-[12px] font-medium text-ink/40">{rp.ladderNote}</p>
      </ReportCard>

      {/* 3. Profile: the real shape against the average, names hidden except the strongest */}
      <ReportCard title={rp.profileTitle} className="lg:col-span-7 lg:flex lg:flex-col">
        <Legend
          items={[
            { tone: "bg-orange", label: rp.profileLegend.you },
            { tone: "bg-ink/40", label: rp.profileLegend.average },
          ]}
        />
        <div className="mt-2 lg:flex lg:flex-1 lg:items-center">
          <ProfileRadar scales={teaser.scales} averages={teaser.scaleAverages} labels={dict.scales} hidden={(s) => s !== teaser.strongest} />
        </div>
        <div className="mt-4 grid gap-2 lg:grid-cols-2">
          <div className="flex items-center gap-3 rounded-control bg-gray-soft px-4 py-3.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-white">
              <Arrow up />
            </span>
            <span className="flex-1">
              <span className="block text-[12px] font-semibold text-ink/45">{rp.strongest}</span>
              <span className="block font-bold">{dict.scales[teaser.strongest]}</span>
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-control bg-gray-soft px-4 py-3.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-orange text-white">
              <Arrow up={false} />
            </span>
            <span className="flex-1">
              <span className="block text-[12px] font-semibold text-ink/45">{rp.weakest}</span>
              <span className="block font-bold">
                <BlurValue strength="strong">Xxxxxxxxxx</BlurValue>
              </span>
            </span>
            <LockIcon className="size-4 text-ink/40" />
          </div>
        </div>
      </ReportCard>

      {/* 4. Thinking style: rarity is open, the name and portrait are locked */}
      <ReportCard title={rp.archetypeTitle} className={rowSpan}>
        <div className="grid grid-cols-[104px_1fr] items-center gap-5">
          <Locked className="aspect-square rounded-tile bg-gray-soft">
            <div className="relative aspect-square">
              <Illustration id="you-mystery" alt="" sizes="104px" className="p-3" />
            </div>
          </Locked>
          <div className="flex flex-col gap-2">
            <p className="text-[1.6rem] font-extrabold leading-none tracking-[-0.045em]">
              <BlurValue strength="strong">Xxxxxxxxx</BlurValue>
            </p>
            <p className="font-semibold text-orange">{fmt(rp.rarity, { pct: teaser.archetypeRarityPct })}</p>
          </div>
        </div>
        <div className="mt-6">
          <RarityDots pct={teaser.archetypeRarityPct} />
        </div>
      </ReportCard>

      {/* 5. Real achievements — shown openly, proof that the analysis is about them */}
      {teaser.achievements.length > 0 && (
        <ReportCard title={rp.noticedTitle} className={rowSpan}>
          <AchievementList items={teaser.achievements.map((a) => achievementText(a, dict))} />
        </ReportCard>
      )}

      {/* 6. Cohort */}
      {teaser.cohort.ageGroup && (
        <section className={`rounded-card bg-ink p-6 sm:p-8 text-white animate-fade-up lg:flex lg:items-end ${rowSpan}`}>
          <p className="text-[1.6rem] font-bold leading-tight tracking-[-0.035em]">
            {cohortText(p.cohort, teaser.cohort, dict, locale)}{" "}
            <span className="text-orange">
              <BlurValue>??</BlurValue>%
            </span>
          </p>
        </section>
      )}

      {/* 7. A glimpse of the detailed breakdown */}
      <ReportCard title={rp.previewTitle} className="lg:col-span-7">
        <Locked label={rp.locked}>
          <div className="flex flex-col gap-6 p-1">
            <ScaleComparison
              scales={PH_SCALES}
              averages={PH_AVERAGES}
              levels={PH_LEVELS}
              labels={dict.scales}
              levelLabels={dict.levels}
              vsAverage={(d) => fmt(rp.vsAverage, { d: d >= 0 ? `+${d}` : `−${Math.abs(d)}` })}
            />
            <DifficultyRings review={PH_REVIEW} labels={rp.difficulty} />
          </div>
        </Locked>
      </ReportCard>

      {/* 8. Table of contents of the full report */}
      <ReportCard title={rp.tocTitle} meta={rp.toc.length} className="lg:col-span-5">
        <ol className="flex flex-col">
          {rp.toc.map((item, i) => (
            <li key={item} className="flex items-center gap-4 border-t border-ink/[0.07] py-3.5 first:border-t-0 first:pt-0 last:pb-0">
              <span className="w-6 font-mono text-[12px] text-ink/35">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex-1 text-[15px] font-semibold leading-snug">{item}</span>
              <LockIcon className="size-4 shrink-0 text-ink/30" />
            </li>
          ))}
        </ol>
      </ReportCard>

      {/* 9. Certificate preview */}
      <div className="animate-fade-up lg:col-span-5">
        <CertificateCard
          labels={dict.certificate}
          name={teaser.name ?? p.certificateNameFallback}
          score={lockedIq}
          archetype={<BlurValue strength="strong">Xxxxxxxxx</BlurValue>}
          date={formatDate(new Date(), locale)}
          serial={teaser.reportId}
        />
      </div>

      {/* 10. The offer, once more, as a closing block */}
      <section className="rounded-card bg-ink p-6 text-white sm:p-8 animate-fade-up lg:col-span-7 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-end justify-between gap-4">
          <div>
            <MonoLabel className="text-white/45">{dict.checkout.total}</MonoLabel>
            <p className="mt-2 text-[3.5rem] font-extrabold leading-none tracking-[-0.05em]">{trialPrice}</p>
          </div>
          <MonoLabel className="pb-1.5 text-white/45">{fmt(dict.landing.honest.priceThen, { price: fullPrice })}</MonoLabel>
        </div>
        <ul className="mt-7 grid gap-2.5">
          {dict.email.contents.map((item) => (
            <li key={item} className="flex items-center gap-3 font-semibold">
              <span className="grid size-6 place-items-center rounded-full bg-white/10 text-orange">
                <CheckIcon className="size-3.5" />
              </span>
              {item}
            </li>
          ))}
        </ul>
        <div ref={finalCta} className="mt-8 flex flex-col gap-3">
          <Button variant="accent" arrow onClick={openCheckout}>
            {ctaLabel}
          </Button>
          <p className="text-center text-[12.5px] font-medium leading-relaxed text-white/45 text-balance">{terms}</p>
          <p className="text-center text-[11.5px] font-medium leading-relaxed text-white/40 text-pretty">{legalNote}</p>
        </div>
      </section>

      <div className="mt-2 flex flex-col gap-3 lg:col-span-12 lg:mx-auto lg:max-w-3xl">
        <p className="text-center text-[12px] font-medium leading-relaxed text-ink/40">{rp.methodText}</p>
        <p className="text-center text-label normal-case tracking-[0.02em] text-ink/40">{p.demo}</p>
      </div>

      {/* Floating pay button for the long middle of the page. */}
      <div
        aria-hidden={!stickyVisible || checkoutOpen}
        className={`fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(12px,env(safe-area-inset-bottom))] transition-[transform,opacity] duration-300 ease-(--ease-out-quint) ${
          stickyVisible && !checkoutOpen ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
        }`}
      >
        <div className="mx-auto max-w-[536px] rounded-full bg-white/80 p-1.5 shadow-lift backdrop-blur-xl">
          <Button variant="accent" arrow onClick={openCheckout} tabIndex={stickyVisible ? 0 : -1}>
            {ctaLabel}
          </Button>
        </div>
      </div>

      {checkoutOpen && (
        <CheckoutSheet
          dict={{ ...dict.checkout, errorGeneric: dict.common.errorGeneric, errorNetwork: dict.common.errorNetwork, demo: p.demo, legal: dict.legal.checkout }}
          priceLabel={trialPrice}
          renewal={{ days: PRICING.trialDays, price: fullPrice, period: PRICING.billingPeriodDays }}
          onClose={closeCheckout}
          onSuccess={() => router.push(routes.result(locale))}
        />
      )}
    </div>
  );
}
