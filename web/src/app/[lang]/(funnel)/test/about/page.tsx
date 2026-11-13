import { AboutClient } from "@/components/steps/AboutClient";
import { resolveLocale } from "@/i18n/server";

export default async function AboutPage() {
  const { locale, dict } = await resolveLocale();
  const { loading, errorGeneric, errorNetwork, retry } = dict.common;
  return (
    <AboutClient
      locale={locale}
      dict={{
        ...dict.about,
        selectOne: dict.quiz.selectOne,
        close: dict.quiz.close,
        genders: dict.genders,
        loading,
        errorGeneric,
        errorNetwork,
        retry,
      }}
    />
  );
}
