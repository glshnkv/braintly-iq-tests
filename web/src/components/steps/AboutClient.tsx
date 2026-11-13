"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CardStack } from "@/components/quiz/CardStack";
import { CardTopBar } from "@/components/quiz/CardTopBar";
import { ChoiceRow, useChoiceKeys } from "@/components/quiz/QuestionCard";
import { ErrorBox, MonoLabel, Spinner } from "@/components/ui";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { AGE_GROUPS, type AgeGroup, type Gender } from "@/lib/api-types";
import { api } from "@/lib/client/api";
import { SELECTION_FEEDBACK_MS, useCardLeave, wait } from "@/lib/client/use-card-leave";
import { useFunnelGuard } from "@/lib/client/use-funnel-guard";
import { fmt } from "@/lib/format";
import { routes } from "@/lib/routes";

interface Props {
  locale: Locale;
  dict: Dictionary["about"] &
    Pick<Dictionary["quiz"], "selectOne" | "close"> &
    Pick<Dictionary["common"], "loading" | "errorGeneric" | "errorNetwork" | "retry"> & { genders: Dictionary["genders"] };
}

const GENDERS: Gender[] = ["male", "female"];

/** Two cards after the last question: gender, then age. Answering the second one computes the result. */
export function AboutClient({ locale, dict }: Props) {
  const guard = useFunnelGuard("about", locale);
  if (guard.status === "error") return <ErrorBox message={dict.errorNetwork} onRetry={guard.retry} retryLabel={dict.retry} />;
  if (guard.status === "loading") return <Spinner label={dict.loading} />;
  // Keyed by session so a new attempt always starts from the first card.
  return <AboutRunner key={guard.state.sessionId} locale={locale} dict={dict} />;
}

function AboutRunner({ locale, dict }: Props) {
  const router = useRouter();
  const [gender, setGender] = useState<Gender | null>(null);
  const [age, setAge] = useState<AgeGroup | null>(null);
  const [step, setStep] = useState<"gender" | "age">("gender");
  const [error, setError] = useState(false);
  const { leaving, leave, reset } = useCardLeave();

  async function chooseGender(g: Gender) {
    if (gender) return;
    setGender(g);
    await wait(SELECTION_FEEDBACK_MS);
    await leave();
    setStep("age");
    reset();
  }

  async function chooseAge(a: AgeGroup) {
    if (!gender || age) return;
    setAge(a);
    setError(false);
    try {
      await Promise.all([api.saveProfile({ gender, ageGroup: a }), wait(SELECTION_FEEDBACK_MS)]);
      await leave();
      router.push(routes.analyzing(locale));
    } catch {
      setAge(null);
      setError(true);
    }
  }

  const isGender = step === "gender";
  useChoiceKeys(isGender ? GENDERS.length : AGE_GROUPS.length, isGender ? !!gender : !!age, (i) =>
    isGender ? chooseGender(GENDERS[i]) : chooseAge(AGE_GROUPS[i]),
  );
  return (
    <div className="flex flex-col items-center gap-4 pt-2 sm:pt-8">
      <CardStack cardKey={step} leaving={leaving}>
        <CardTopBar closeHref={routes.landing(locale)} closeLabel={dict.close}>
          <MonoLabel>{fmt(dict.label, { n: isGender ? 1 : 2 })}</MonoLabel>
        </CardTopBar>
        <h2 className="text-[1.55rem] sm:text-[1.75rem] font-bold leading-[1.18] tracking-[-0.03em]">
          {isGender ? dict.genderQuestion : dict.ageQuestion}
        </h2>
        <p className="mt-2 text-[15px] font-medium text-ink/55">{dict.subtitle}</p>
        <MonoLabel muted className="mt-7">
          {dict.selectOne}
        </MonoLabel>
        <div role="radiogroup" className="mt-3 grid gap-2">
          {isGender
            ? GENDERS.map((g, i) => (
                <ChoiceRow key={g} index={i} label={dict.genders[g]} selected={gender === g} disabled={!!gender} onSelect={() => chooseGender(g)} />
              ))
            : AGE_GROUPS.map((a, i) => (
                <ChoiceRow
                  key={a}
                  index={i}
                  label={fmt(dict.ageLabel, { age: a.replace("-", "–") })}
                  selected={age === a}
                  disabled={!!age}
                  onSelect={() => chooseAge(a)}
                />
              ))}
        </div>
      </CardStack>
      {error && (
        <div className="w-full max-w-[480px]">
          <ErrorBox message={dict.errorGeneric} />
        </div>
      )}
    </div>
  );
}
