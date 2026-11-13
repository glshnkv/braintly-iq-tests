"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CardStack, LinearProgress } from "@/components/quiz/CardStack";
import { CardTopBar } from "@/components/quiz/CardTopBar";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import type { Locale } from "@/i18n/config";
import { api } from "@/lib/client/api";
import { SELECTION_FEEDBACK_MS, useCardLeave, wait } from "@/lib/client/use-card-leave";
import { fmt } from "@/lib/format";
import type { PublicQuestion } from "@/lib/quiz/types";
import { routes } from "@/lib/routes";

interface Props {
  locale: Locale;
  question: PublicQuestion;
  total: number;
  dict: { questionLabel: string; selectOne: string; progress: string; close: string; errorGeneric: string };
}

const UTM_KEYS = ["source", "medium", "campaign"] as const;

function readUtm(): Record<string, string> | undefined {
  const params = new URLSearchParams(window.location.search);
  const utm = Object.fromEntries(
    UTM_KEYS.map((k) => [k, params.get(`utm_${k}`)]).filter((e): e is [string, string] => !!e[1]),
  );
  return Object.keys(utm).length ? utm : undefined;
}

/**
 * The first question lives right on the landing: answering it starts the session,
 * saves the answer and hands over to /test, which resumes from question 2.
 */
export function HeroQuiz({ locale, question, total, dict }: Props) {
  const router = useRouter();
  // Set after mount: the landing is prerendered, so the clock must start in the browser.
  const shownAt = useRef(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const { leaving, leave, reset } = useCardLeave();
  const visits = useRef(0);

  // The landing stays alive (hidden) while the user is in the test. When it's hidden, put the
  // card back to its fresh state; when it's shown again, bring the user back to the question.
  useLayoutEffect(() => {
    if (visits.current++ > 0) window.scrollTo({ top: 0 });
    return () => {
      setSelected(null);
      setError(false);
      reset();
    };
  }, [reset]);

  useEffect(() => {
    shownAt.current = Date.now();
    router.prefetch(routes.test(locale));
  }, [locale, router]);

  async function answer(choice: number) {
    if (selected !== null) return;
    setSelected(choice);
    setError(false);
    const timeMs = Date.now() - shownAt.current;
    try {
      await Promise.all([
        (async () => {
          await api.startSession({ locale, utm: readUtm() });
          await api.answer({ questionId: question.id, choice, timeMs });
        })(),
        wait(SELECTION_FEEDBACK_MS),
      ]);
      await leave();
      router.push(routes.test(locale));
    } catch {
      reset();
      setSelected(null);
      setError(true);
    }
  }

  return (
    <div className="w-full flex flex-col items-center gap-3">
      <CardStack cardKey={question.id} leaving={leaving}>
        <CardTopBar closeLabel={dict.close}>
          <LinearProgress answered={0} total={total} label={fmt(dict.progress, { n: 1, total })} />
        </CardTopBar>
        <QuestionCard
          question={question}
          label={fmt(dict.questionLabel, { n: "01" })}
          total={total}
          keys={false}
          hint={dict.selectOne}
          selected={selected}
          disabled={selected !== null}
          onSelect={answer}
        />
      </CardStack>
      {error && (
        <p role="alert" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-orange-dark">
          {dict.errorGeneric}
        </p>
      )}
    </div>
  );
}
