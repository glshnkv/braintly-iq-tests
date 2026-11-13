"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CardStack } from "@/components/quiz/CardStack";
import { ChoiceRow } from "@/components/quiz/QuestionCard";
import { Button, CheckIcon, Chip, ErrorBox, MonoLabel, Spinner, type ChipTone } from "@/components/ui";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { Expectation, ScaleLevel, Teaser } from "@/lib/api-types";
import { api, track } from "@/lib/client/api";
import { useFunnelGuard } from "@/lib/client/use-funnel-guard";
import { SCALES, type Scale } from "@/lib/quiz/types";
import { routes } from "@/lib/routes";

interface Props {
  locale: Locale;
  dict: Dictionary["analyzing"] & {
    scales: Dictionary["scales"];
    levels: Dictionary["levels"];
    common: Pick<Dictionary["common"], "loading" | "errorNetwork" | "retry" | "continue">;
  };
}

/** Time to fill one scale. The whole animation takes SCALES.length × this. */
const STEP_MS = 1600;
/** Micro-questions pause the animation after these scale indexes. */
const QUESTION_AFTER: Record<number, "q1" | "q2"> = { 1: "q1", 3: "q2" };

const LEVEL_TONE: Record<ScaleLevel, ChipTone> = { high: "ink", mid: "soft", low: "orange" };

/** Linearly animates a number towards `target` over `duration` ms. */
function useTween(target: number, duration: number) {
  const [value, setValue] = useState(0);
  const current = useRef(0);
  useEffect(() => {
    const from = current.current;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      current.current = from + (target - from) * k;
      setValue(current.current);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

export function AnalyzingClient({ locale, dict }: Props) {
  const guard = useFunnelGuard("analyzing", locale);
  if (guard.status === "error")
    return <ErrorBox message={dict.common.errorNetwork} onRetry={guard.retry} retryLabel={dict.common.retry} />;
  if (guard.status === "loading") return <Spinner label={dict.common.loading} />;
  // Keyed by session so the analysis animation restarts for a new attempt.
  return <AnalyzingRunner key={guard.state.sessionId} locale={locale} dict={dict} />;
}

function StatusIcon({ state }: { state: "done" | "active" | "waiting" }) {
  if (state === "done")
    return (
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-white animate-fade-in">
        <CheckIcon className="size-3.5" />
      </span>
    );
  if (state === "active")
    return <span aria-hidden className="size-7 shrink-0 rounded-full border-[2.5px] border-gray border-t-orange animate-spin" />;
  return <span aria-hidden className="size-7 shrink-0 rounded-full bg-gray-soft" />;
}

function AnalyzingRunner({ locale, dict }: Props) {
  const router = useRouter();
  const [teaser, setTeaser] = useState<Teaser | null>(null);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState(0);
  const [question, setQuestion] = useState<"q1" | "q2" | null>(null);
  const asked = useRef(new Set<string>());

  useEffect(() => {
    track("analyzing_view");
    api.getTeaser().then(setTeaser, () => setFailed(true));
  }, []);

  useEffect(() => {
    if (!teaser || question || done >= SCALES.length) return;
    const pending = QUESTION_AFTER[done];
    if (pending && !asked.current.has(pending)) {
      asked.current.add(pending);
      setQuestion(pending);
      return;
    }
    const id = setTimeout(() => setDone((d) => d + 1), STEP_MS);
    return () => clearTimeout(id);
  }, [teaser, question, done]);

  const finished = done >= SCALES.length;
  // While a scale is filling, the counter runs towards the end of that scale's share.
  const target = !teaser ? 0 : finished ? 100 : ((question ? done : done + 1) / SCALES.length) * 100;
  const progress = useTween(target, STEP_MS);

  function answer(body: { expectation?: Expectation; firstTest?: boolean }) {
    // Non-critical data: never block the funnel on it.
    void api.saveExpectation(body).catch(() => undefined);
    setQuestion(null);
  }

  if (failed)
    return <ErrorBox message={dict.common.errorNetwork} onRetry={() => window.location.reload()} retryLabel={dict.common.retry} />;
  if (!teaser) return <Spinner label={dict.common.loading} />;

  return (
    <div className="flex flex-col items-center pt-2 sm:pt-8">
      <CardStack cardKey="analyzing" leaving={false}>
        <div className="flex items-end justify-between gap-4">
          <p className="text-[4rem] sm:text-[4.5rem] font-extrabold leading-[0.9] tracking-[-0.05em] tabular-nums" aria-live="off">
            {Math.round(progress)}
            <span className="text-ink/25">%</span>
          </p>
          <MonoLabel muted className="pb-1.5">
            {Math.min(done, SCALES.length)} / {SCALES.length}
          </MonoLabel>
        </div>
        <div aria-hidden className="mt-5 h-1.5 overflow-hidden rounded-full bg-gray">
          <div className="h-full rounded-full bg-orange" style={{ width: `${progress}%` }} />
        </div>

        <h1 className="mt-8 text-title" aria-live="polite">
          {finished ? dict.done : dict.title}
        </h1>
        <p className="mt-2 text-[15px] font-medium text-ink/55 leading-relaxed">{dict.subtitle}</p>

        <ul className="mt-6 flex flex-col gap-1">
          {SCALES.map((scale: Scale, i) => {
            const state = i < done ? "done" : i === done && !question ? "active" : "waiting";
            return (
              <li
                key={scale}
                className={`flex min-h-14 items-center gap-3.5 rounded-control px-3 transition-colors duration-300 ${
                  state === "active" ? "bg-gray-soft" : ""
                }`}
              >
                <StatusIcon state={state} />
                <span className={`flex-1 text-[17px] font-semibold tracking-[-0.01em] ${state === "waiting" ? "text-ink/35" : ""}`}>
                  {dict.scales[scale]}
                </span>
                {state === "done" && (
                  <Chip tone={LEVEL_TONE[teaser.scaleLevels[scale]]} className="animate-fade-in">
                    {dict.levels[teaser.scaleLevels[scale]]}
                  </Chip>
                )}
                {state === "active" && (
                  <span aria-hidden className="dot-pulse flex gap-1 pr-2">
                    <span className="size-1.5 rounded-full bg-ink" />
                    <span className="size-1.5 rounded-full bg-ink" />
                    <span className="size-1.5 rounded-full bg-ink" />
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        {question && (
          <div className="mt-6 rounded-tile bg-gray-soft p-4 sm:p-5 flex flex-col gap-4 animate-fade-up">
            <p className="text-lg font-bold tracking-[-0.02em] px-1">{dict[question]}</p>
            <div role="radiogroup" className={`grid gap-2 ${question === "q2" ? "grid-cols-2" : ""}`}>
              {question === "q1"
                ? (Object.keys(dict.q1Options) as Expectation[]).map((e, i) => (
                    <ChoiceRow
                      key={e}
                      index={i}
                      tone="white"
                      label={dict.q1Options[e]}
                      selected={false}
                      disabled={false}
                      onSelect={() => answer({ expectation: e })}
                    />
                  ))
                : [true, false].map((firstTest, i) => (
                    <ChoiceRow
                      key={String(firstTest)}
                      index={i}
                      tone="white"
                      label={firstTest ? dict.yes : dict.no}
                      selected={false}
                      disabled={false}
                      onSelect={() => answer({ firstTest })}
                    />
                  ))}
            </div>
          </div>
        )}

        {finished && (
          <div className="mt-8 animate-fade-up">
            <Button arrow onClick={() => router.push(routes.email(locale))}>
              {dict.common.continue}
            </Button>
          </div>
        )}
      </CardStack>
    </div>
  );
}
