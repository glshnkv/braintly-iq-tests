"use client";

import { useEffect, useState } from "react";
import { Illustration } from "@/components/landing/Illustration";
import {
  CelebLadder,
  DifficultyRings,
  Distribution,
  IqBandScale,
  Legend,
  PeopleGrid,
  ProfileRadar,
  ScaleComparison,
  TimeChart,
  bandOf,
  medianSeconds,
  type LadderRow,
} from "@/components/report/charts";
import { AchievementList, CertificateCard, MethodStrip, REPORT_GRID, RarityDots, ReportCard, ReportCover, StatTile } from "@/components/report/ReportPieces";
import { ArrowRight, Button, Chip, ErrorBox, LinkButton, MonoLabel, Spinner } from "@/components/ui";
import { TYPE_ILLUSTRATION } from "@/config/illustrations";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { Expectation, FullResult } from "@/lib/api-types";
import { api, track } from "@/lib/client/api";
import { useFunnelGuard } from "@/lib/client/use-funnel-guard";
import { achievementText, cohortText } from "@/lib/copy";
import { fmt, formatDate, formatMoney } from "@/lib/format";
import { CELEBRITIES } from "@/lib/quiz/celebrities";
import { SCALES } from "@/lib/quiz/types";
import { routes } from "@/lib/routes";

interface Props {
  locale: Locale;
  dict: Dictionary;
}

function actualBand(iq: number): Expectation {
  if (iq >= 110) return "above";
  if (iq >= 90) return "average";
  return "below";
}

const ORDER: Expectation[] = ["below", "average", "above"];

function expectationMessage(expected: Expectation | null, iq: number, dict: Dictionary["result"]["expectation"]) {
  if (!expected) return null;
  const diff = ORDER.indexOf(actualBand(iq)) - ORDER.indexOf(expected);
  return diff > 0 ? dict.under : diff < 0 ? dict.over : dict.match;
}

function formatDuration(ms: number) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function ResultClient({ locale, dict }: Props) {
  const guard = useFunnelGuard("result", locale);
  const [result, setResult] = useState<FullResult | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelFailed, setCancelFailed] = useState(false);

  useEffect(() => {
    if (guard.status !== "ready") return;
    track("result_view");
    api.getResult().then(setResult, () => setFailed(true));
  }, [guard.status]);

  if (guard.status === "error" || failed)
    return <ErrorBox message={dict.common.errorNetwork} onRetry={() => window.location.reload()} retryLabel={dict.common.retry} />;
  if (guard.status === "loading" || !result) return <Spinner label={dict.common.loading} />;

  const r = dict.result;
  const rp = dict.report;
  const certificatePath = routes.certificate(locale, result.shareId);
  const shareUrl = `${window.location.origin}${certificatePath}`;
  const expectation = expectationMessage(result.expectation, result.iq, r.expectation);
  const archetype = dict.archetypes[result.archetype];
  const beaten = Math.floor(result.percentile);
  const oneIn = Math.round(100 / Math.max(1, 100 - result.percentile));
  const reportId = result.shareId.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase();
  const strengths = [...SCALES].sort((a, b) => result.scales[b] - result.scales[a]).slice(0, 2);
  const secondsPerTask = Math.round(result.totalTimeMs / result.totalQuestions / 1000);
  // Bottom row: three equal tiles when there are achievements, two halves otherwise.
  const sideSpan = result.achievements.length > 0 ? "lg:col-span-4" : "lg:col-span-6";
  const signed = (d: number) => fmt(rp.vsAverage, { d: d >= 0 ? `+${d}` : `−${Math.abs(d)}` });

  const ladder: LadderRow[] = [
    ...CELEBRITIES.map((c) => ({ kind: "celeb" as const, id: c.id, name: c.name[locale], role: c.role[locale], iq: c.iq })),
    { kind: "average", name: rp.averagePerson, role: rp.averageRole, iq: 100 },
    { kind: "you", name: rp.you, iq: result.iq },
  ];

  async function share() {
    track("share_click");
    const text = fmt(r.shareText, { iq: result!.iq });
    if (navigator.share) {
      await navigator.share({ title: dict.meta.title, text, url: shareUrl }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(`${text} ${shareUrl}`).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function cancel() {
    setCanceling(true);
    setCancelFailed(false);
    try {
      const subscription = await api.cancelSubscription();
      setResult((prev) => (prev ? { ...prev, subscription } : prev));
    } catch {
      setCancelFailed(true);
    } finally {
      setCanceling(false);
    }
  }

  return (
    <div className={`${REPORT_GRID} pt-2 sm:pt-6`}>
      {/* 0. Cover and the verdict */}
      <section className="rounded-card bg-white p-6 sm:p-8 animate-fade-up lg:col-span-5">
        <ReportCover
          preparedFor={rp.preparedFor}
          name={result.name}
          date={formatDate(result.completedAt, locale)}
        />
        <div className="mt-9 text-center">
          <MonoLabel muted>{rp.iqLabel}</MonoLabel>
          <p className="mt-4 text-[8.5rem] sm:text-[10rem] font-extrabold leading-[0.8] tracking-[-0.07em] tabular-nums">{result.iq}</p>
          <p className="mt-6">
            <Chip tone="ink" className="!px-4 !py-1.5 !text-[14px]">
              {rp.bands[bandOf(result.iq)]}
            </Chip>
          </p>
          <p className="mt-4 text-xl font-bold tracking-[-0.02em]">{fmt(r.beat, { p: beaten })}</p>
          {expectation && <p className="mx-auto mt-2 max-w-sm text-[14px] font-medium text-ink/55 text-balance">{expectation}</p>}
        </div>
        <div className="mt-8 rounded-tile bg-gray-soft p-4 sm:p-5">
          <MonoLabel muted className="mb-1">{rp.bandTitle}</MonoLabel>
          <IqBandScale iq={result.iq} labels={rp.bands} />
        </div>
      </section>

      {/* 1. Key numbers */}
      <ReportCard title={rp.factsTitle} className="lg:col-span-7 lg:flex lg:flex-col">
        <div className="grid grid-cols-2 gap-2 lg:flex-1 lg:auto-rows-fr">
          <StatTile tone="ink" value={`${beaten}%`} caption={rp.factBeat} />
          {result.percentile >= 50 ? (
            <StatTile value={fmt(rp.factOneIn, { n: oneIn })} caption={rp.factOneInCaption} />
          ) : (
            <StatTile value={`${result.correctCount}/${result.totalQuestions}`} caption={rp.factCorrect} />
          )}
          {result.cohort.ageGroup && result.cohort.topPct <= 50 ? (
            <StatTile
              value={fmt(rp.factCohort, { pct: result.cohort.topPct })}
              caption={cohortText(rp.factCohortCaption, result.cohort, dict, locale)}
            />
          ) : (
            <StatTile value={fmt(r.seconds, { s: secondsPerTask })} caption={rp.perQuestion} />
          )}
          <StatTile tone="orange" value={`${result.speed.fasterThanPct}%`} caption={rp.factSpeed} />
        </div>
      </ReportCard>

      {/* 2. Distribution and the room of 100 */}
      <ReportCard title={rp.distributionTitle} meta="σ = 15" className="lg:col-span-7">
        <Distribution iq={result.iq} youLabel={rp.you} />
        <p className="mt-2 text-[13px] font-medium text-ink/45">{rp.distributionNote}</p>
        <div className="mt-7 rounded-tile bg-gray-soft p-4 sm:p-5">
          <p className="text-[15px] font-bold tracking-[-0.01em]">{rp.peopleTitle}</p>
          <p className="mt-1 text-[14px] leading-snug text-ink/60">{fmt(rp.peopleText, { n: beaten })}</p>
          <div className="mt-4">
            <PeopleGrid percentile={result.percentile} />
          </div>
          <div className="mt-4">
            <Legend
              items={[
                { tone: "bg-ink", label: rp.peopleLegend.below },
                { tone: "bg-orange", label: rp.peopleLegend.you },
                { tone: "bg-gray-strong", label: rp.peopleLegend.above },
              ]}
            />
          </div>
        </div>
      </ReportCard>

      {/* 3. Famous people ladder */}
      <ReportCard title={rp.ladderTitle} className="lg:col-span-5">
        <CelebLadder rows={ladder} />
        <p className="mt-4 text-[12px] font-medium text-ink/40">{rp.ladderNote}</p>
      </ReportCard>

      {/* 4. Profile against the average */}
      <ReportCard title={rp.profileTitle} className="lg:col-span-12">
        <div className="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-14">
          <div className="lg:sticky lg:top-6">
            <Legend
              items={[
                { tone: "bg-orange", label: rp.profileLegend.you },
                { tone: "bg-ink/40", label: rp.profileLegend.average },
              ]}
            />
            <div className="mt-2">
              <ProfileRadar scales={result.scales} averages={result.scaleAverages} labels={dict.scales} showValues />
            </div>
          </div>
          <div className="mt-6 lg:mt-0">
            <Legend
              items={[
                { tone: "bg-ink", label: rp.profileLegend.you },
                { tone: "bg-orange", label: rp.profileLegend.average, shape: "tick" },
              ]}
            />
            <div className="mt-5">
              <ScaleComparison
                scales={result.scales}
                averages={result.scaleAverages}
                levels={result.scaleLevels}
                labels={dict.scales}
                levelLabels={dict.levels}
                vsAverage={signed}
                insights={Object.fromEntries(SCALES.map((s) => [s, dict.scaleInsights[s][result.scaleLevels[s]]])) as Record<(typeof SCALES)[number], string>}
              />
            </div>
          </div>
        </div>
      </ReportCard>

      {/* 5. Thinking style */}
      <ReportCard title={rp.archetypeTitle} className="lg:col-span-7">
        <div className="grid grid-cols-[112px_1fr] sm:grid-cols-[160px_1fr] items-center gap-5 sm:gap-7">
          <div className="relative aspect-square rounded-tile bg-gray-soft">
            <Illustration id={TYPE_ILLUSTRATION[result.archetype]} alt={archetype.name} sizes="160px" className="p-3" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[1.6rem] sm:text-[2.4rem] font-extrabold leading-none tracking-[-0.045em] break-words hyphens-auto">{archetype.name}</p>
            <p className="font-semibold text-orange">{fmt(rp.rarity, { pct: result.archetypeRarityPct })}</p>
          </div>
        </div>
        <div className="mt-6">
          <RarityDots pct={result.archetypeRarityPct} />
        </div>
        <p className="mt-6 text-[17px] leading-relaxed text-ink/70">{archetype.description}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <MonoLabel muted className="mb-2.5">{rp.strengths}</MonoLabel>
            <div className="flex flex-wrap gap-1.5">
              {strengths.map((s) => (
                <Chip key={s} tone="ink">
                  {dict.scales[s]} · {result.scales[s]}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <MonoLabel muted className="mb-2.5">{rp.careers}</MonoLabel>
            <div className="flex flex-wrap gap-1.5">
              {archetype.careers.map((c) => (
                <Chip key={c}>{c}</Chip>
              ))}
            </div>
          </div>
        </div>
      </ReportCard>

      {/* 6. Speed and accuracy */}
      <ReportCard title={rp.accuracyTitle} meta={formatDuration(result.totalTimeMs)} className="lg:col-span-5">
        <DifficultyRings review={result.review} labels={rp.difficulty} />
        <div className="mt-7">
          <p className="text-[15px] font-bold tracking-[-0.01em]">{rp.timeChartTitle}</p>
          <div className="mt-2 mb-4">
            <Legend
              items={[
                { tone: "bg-ink", label: r.correct },
                { tone: "bg-orange", label: r.wrong },
                { tone: "", label: `${rp.median} ${fmt(r.seconds, { s: Math.round(medianSeconds(result.review)) })}`, shape: "dash" },
              ]}
            />
          </div>
          <TimeChart review={result.review} secondsLabel={(s) => fmt(r.seconds, { s })} />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <StatTile value={fmt(r.seconds, { s: secondsPerTask })} caption={rp.perQuestion} />
          <StatTile value={`${result.speed.fasterThanPct}%`} caption={rp.factSpeed} />
        </div>
      </ReportCard>

      {result.achievements.length > 0 && (
        <ReportCard title={r.achievementsTitle} className="lg:col-span-4">
          <AchievementList items={result.achievements.map((a) => achievementText(a, dict))} />
        </ReportCard>
      )}

      {/* 7. Growth */}
      <ReportCard title={rp.growthTitle} className={sideSpan}>
        <p className="text-[17px] leading-relaxed text-ink/70">{fmt(rp.growthLead, { scale: dict.scales[result.weakest].toLowerCase() })}</p>
        <ul className="mt-5 flex flex-col gap-2">
          {dict.scaleTips[result.weakest].map((tip) => (
            <li key={tip} className="flex items-start gap-3 rounded-control bg-gray-soft px-4 py-3.5 font-semibold leading-snug">
              <span className="mt-px grid size-6 shrink-0 place-items-center rounded-full bg-ink text-white">
                <ArrowRight className="size-3" />
              </span>
              {tip}
            </li>
          ))}
        </ul>
      </ReportCard>

      {/* 8. Answer review */}
      <ReportCard
        className={sideSpan}
        title={r.reviewTitle}
        meta={fmt(r.reviewSummary, {
          correct: result.correctCount,
          total: result.totalQuestions,
          minutes: Math.max(1, Math.round(result.totalTimeMs / 60_000)),
        })}
      >
        <ul className="grid grid-cols-5 gap-1.5">
          {result.review.map((item) => (
            <li
              key={item.questionId}
              title={`${dict.scales[item.scale]} · ${item.isCorrect ? r.correct : r.wrong} · ${fmt(r.seconds, { s: Math.round(item.timeMs / 1000) })}`}
              className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl ${
                item.isCorrect ? "bg-ink text-white" : "bg-orange-soft text-orange-dark"
              }`}
            >
              <span className="font-mono text-sm">{String(item.number).padStart(2, "0")}</span>
              <span className={`font-mono text-[10px] ${item.isCorrect ? "text-white/45" : "text-orange-dark/60"}`}>{item.pctCorrect}%</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12.5px] font-medium text-ink/45">{rp.reviewHint}</p>
      </ReportCard>

      {/* 9. Certificate */}
      <div className="flex flex-col gap-2 animate-fade-up lg:col-span-7">
        <CertificateCard
          labels={dict.certificate}
          name={result.name ?? dict.certificate.anonymous}
          score={result.iq}
          archetype={archetype.name}
          date={formatDate(result.completedAt, locale)}
          serial={reportId}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button arrow onClick={share} className="sm:flex-1">
            {copied ? r.copied : r.share}
          </Button>
          <LinkButton href={certificatePath} variant="white" size="lg" block className="sm:w-auto">
            {r.openCertificate}
          </LinkButton>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3 lg:col-span-5 lg:mt-0">
        {result.subscription && (
          <ReportCard title={r.subscriptionTitle}>
            {result.subscription.status === "canceled" ? (
              <p className="font-medium text-ink/70">{r.canceled}</p>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="font-medium leading-relaxed text-ink/70">
                  {fmt(r.trialUntil, {
                    date: formatDate(result.subscription.trialEndsAt, locale),
                    price: formatMoney(result.subscription.priceMinor, result.subscription.currency, locale),
                  })}
                </p>
                <Button variant="soft" size="md" onClick={cancel} disabled={canceling}>
                  {canceling ? r.canceling : r.cancel}
                </Button>
                {cancelFailed && (
                  <p role="alert" className="text-sm font-semibold text-orange-dark">
                    {dict.common.errorGeneric}
                  </p>
                )}
              </div>
            )}
          </ReportCard>
        )}

        <ReportCard title={rp.methodTitle}>
          <MethodStrip
            items={[
              { value: result.totalQuestions, label: rp.stats.questions },
              { value: 5, label: rp.stats.scales },
              { value: formatDuration(result.totalTimeMs), label: rp.stats.time },
              { value: "σ 15", label: "IQ" },
            ]}
          />
          <p className="mt-4 text-[13px] leading-relaxed text-ink/50">{rp.methodText}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-ink/50">{dict.common.disclaimer}</p>
        </ReportCard>
      </div>
    </div>
  );
}
