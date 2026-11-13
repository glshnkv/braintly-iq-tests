import { QuizClient } from "@/components/quiz/QuizClient";
import { resolveLocale } from "@/i18n/server";
import { getPublicQuestions } from "@/lib/quiz/public";

export default async function TestPage() {
  const { locale, dict } = await resolveLocale();
  const { continue: cont, retry, loading, errorGeneric, errorNetwork } = dict.common;
  return (
    <QuizClient
      locale={locale}
      questions={getPublicQuestions(locale)}
      dict={{ ...dict.quiz, continue: cont, retry, loading, errorGeneric, errorNetwork }}
    />
  );
}
