"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, ErrorBox, MonoLabel, Spinner, StarIcon } from "@/components/ui";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { Praise } from "@/lib/api-types";
import { api } from "@/lib/client/api";
import { useCardLeave, wait, SELECTION_FEEDBACK_MS } from "@/lib/client/use-card-leave";
import { useFunnelGuard } from "@/lib/client/use-funnel-guard";
import { fmt } from "@/lib/format";
import type { PublicQuestion } from "@/lib/quiz/types";
import { routes } from "@/lib/routes";
import { CardStack, LinearProgress } from "./CardStack";
import { CardTopBar } from "./CardTopBar";
import { QuestionCard } from "./QuestionCard";

type QuizDict = Dictionary["quiz"] &
  Pick<Dictionary["common"], "continue" | "retry" | "loading" | "errorGeneric" | "errorNetwork">;

interface Props {
  locale: Locale;
  questions: PublicQuestion[];
  dict: QuizDict;
}

type Phase =
  | { kind: "memorize"; endsAt: number }
  | { kind: "question" }
  | { kind: "saving"; choice: number }
  | { kind: "error"; choice: number }
  | { kind: "praise"; praise: Praise };

const pad = (n: number) => String(n).padStart(2, "0");

/** Thin bar that drains while the memory stimulus is on screen. */
function MemorizeTimer({ endsAt, now, totalMs }: { endsAt: number; now: number; totalMs: number }) {
  const left = Math.max(0, Math.min(1, (endsAt - now) / totalMs));
  return (
    <div aria-hidden className="mt-3 h-1 overflow-hidden rounded-full bg-gray">
      <div className="h-full rounded-full bg-orange transition-[width] duration-200 ease-linear" style={{ width: `${left * 100}%` }} />
    </div>
  );
}

function praiseText(praise: Praise, dict: QuizDict) {
  switch (praise.kind) {
    case "rare":
      return fmt(dict.praiseRare, { pct: praise.pctCorrect });
    case "streak":
      return fmt(dict.praiseStreak, { n: praise.length });
    case "keepGoing":
      return dict.praiseKeepGoing;
  }
}

function phaseFor(question: PublicQuestion, now: number): Phase {
  return question.content.kind === "memory" ? { kind: "memorize", endsAt: now + question.content.showMs } : { kind: "question" };
}

/** Loads progress and resumes from the first unanswered question. */
export function QuizClient({ locale, questions, dict }: Props) {
  const router = useRouter();
  const guard = useFunnelGuard("test", locale);

  const resumeIndex = useMemo(() => {
    if (guard.status !== "ready") return null;
    const answered = new Set(guard.state.answeredIds);
    return questions.findIndex((q) => !answered.has(q.id));
  }, [guard, questions]);

  useEffect(() => {
    if (resumeIndex === -1) router.replace(routes.about(locale));
  }, [resumeIndex, router, locale]);

  if (guard.status === "error") return <ErrorBox message={dict.errorNetwork} onRetry={guard.retry} retryLabel={dict.retry} />;
  if (guard.status !== "ready" || resumeIndex === null || resumeIndex === -1) return <Spinner label={dict.loading} />;
  // Keyed by session: starting a new test (on the landing) must not resume a previous attempt's card.
  return <QuizRunner key={guard.state.sessionId} locale={locale} questions={questions} dict={dict} initialIndex={resumeIndex} />;
}

function QuizRunner({ locale, questions, dict, initialIndex }: Props & { initialIndex: number }) {
  const router = useRouter();
  const [mountedAt] = useState(() => Date.now());
  const [now, setNow] = useState(mountedAt);
  const [index, setIndex] = useState(initialIndex);
  const [phase, setPhase] = useState<Phase>(() => phaseFor(questions[initialIndex], mountedAt));
  const [shownAt, setShownAt] = useState(mountedAt);
  // Each "sheet" (memorize, question, praise) is its own card in the pile.
  const [sheet, setSheet] = useState(0);
  // Where the progress bar on the next card starts growing from (the value shown on the previous card).
  const [barFrom, setBarFrom] = useState(initialIndex - 1);
  const { leaving, leave, reset } = useCardLeave();
  // Guards against double transitions (e.g. the memorize timer firing while "I've got it" is animating).
  const transitioning = useRef(false);
  const question = questions[index];
  // On the praise card the current question is already answered.
  const answeredCount = phase.kind === "praise" ? index + 1 : index;

  // Ticking clock for the memorize countdown.
  useEffect(() => {
    if (phase.kind !== "memorize") return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [phase.kind]);

  async function showNextSheet(next: () => void) {
    if (transitioning.current) return;
    transitioning.current = true;
    await leave();
    setBarFrom(answeredCount);
    next();
    setSheet((s) => s + 1);
    reset();
    transitioning.current = false;
  }

  function startAnswering() {
    void showNextSheet(() => {
      setPhase({ kind: "question" });
      setShownAt(Date.now());
    });
  }

  // Hide the memory stimulus when its time is up.
  useEffect(() => {
    if (phase.kind !== "memorize") return;
    const id = setTimeout(startAnswering, Math.max(0, phase.endsAt - Date.now()));
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-arm only when the phase changes
  }, [phase]);

  function goNext() {
    const next = index + 1;
    if (next >= questions.length) {
      router.push(routes.about(locale));
      return;
    }
    void showNextSheet(() => {
      const t = Date.now();
      setIndex(next);
      setPhase(phaseFor(questions[next], t));
      setShownAt(t);
    });
  }

  async function submit(choice: number) {
    setPhase({ kind: "saving", choice });
    const timeMs = Date.now() - shownAt;
    try {
      const [res] = await Promise.all([api.answer({ questionId: question.id, choice, timeMs }), wait(SELECTION_FEEDBACK_MS)]);
      if (res.answeredCount >= questions.length) {
        await leave();
        router.push(routes.about(locale));
      } else if (res.praise) {
        void showNextSheet(() => setPhase({ kind: "praise", praise: res.praise! }));
      } else {
        goNext();
      }
    } catch {
      setPhase({ kind: "error", choice });
    }
  }

  const selected = phase.kind === "saving" || phase.kind === "error" ? phase.choice : null;
  const topBar = (
    <CardTopBar closeHref={routes.landing(locale)} closeLabel={dict.close}>
      <LinearProgress answered={answeredCount} from={barFrom} total={questions.length} label={fmt(dict.progress, { n: index + 1, total: questions.length })} />
    </CardTopBar>
  );

  return (
    <div className="flex flex-col items-center gap-4 pt-2 sm:pt-8">
      <CardStack cardKey={`${question.id}-${sheet}`} leaving={leaving}>
        {topBar}
        {phase.kind === "praise" ? (
          <div className="flex flex-col">
            <div className="flex items-center gap-2.5">
              <span className="grid size-7 place-items-center rounded-full bg-orange text-white">
                <StarIcon className="size-3.5" />
              </span>
              <MonoLabel>{dict.praiseTitle}</MonoLabel>
            </div>
            <p className="mt-5 text-[1.7rem] sm:text-[2rem] font-bold leading-[1.15] tracking-[-0.03em] text-balance">
              {praiseText(phase.praise, dict)}
            </p>
            <div className="mt-10 flex justify-end">
              <Button block={false} arrow onClick={goNext}>
                {dict.continue}
              </Button>
            </div>
          </div>
        ) : phase.kind === "memorize" && question.content.kind === "memory" ? (
          <div className="flex flex-col">
            <MonoLabel>
              {fmt(dict.questionLabel, { n: pad(index + 1) })}
              <span className="text-ink/35"> / {questions.length}</span>
            </MonoLabel>
            <h2 className="mt-4 text-[1.55rem] sm:text-[1.75rem] font-bold tracking-[-0.03em]">{dict.memorize}</h2>
            <div className="mt-5 rounded-tile bg-gray-soft px-5 py-8 grid place-items-center">
              <p className="text-center text-4xl sm:text-5xl font-extrabold tracking-[0.1em] leading-snug break-words">
                {question.content.stimulus.join(question.content.stimulus.some((s) => s.length > 1) ? ", " : " ")}
              </p>
            </div>
            <MemorizeTimer endsAt={phase.endsAt} now={now} totalMs={question.content.showMs} />
            <div className="mt-6 flex items-center justify-between gap-4">
              <MonoLabel muted>{fmt(dict.hidesIn, { s: Math.max(1, Math.ceil((phase.endsAt - now) / 1000)) })}</MonoLabel>
              <Button block={false} size="md" onClick={startAnswering}>
                {dict.ready}
              </Button>
            </div>
          </div>
        ) : (
          <QuestionCard
            question={question}
            label={fmt(dict.questionLabel, { n: pad(index + 1) })}
            total={questions.length}
            hint={dict.selectOne}
            selected={selected}
            disabled={phase.kind !== "question"}
            onSelect={submit}
          />
        )}
      </CardStack>

      {phase.kind === "error" && (
        <div className="w-full max-w-[480px]">
          <ErrorBox message={dict.saveError} onRetry={() => submit(phase.choice)} retryLabel={dict.retry} />
        </div>
      )}
    </div>
  );
}
