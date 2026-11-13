import { AnalyzingClient } from "@/components/steps/AnalyzingClient";
import { resolveLocale } from "@/i18n/server";

export default async function AnalyzingPage() {
  const { locale, dict } = await resolveLocale();
  const { loading, errorNetwork, retry, continue: cont } = dict.common;
  return (
    <AnalyzingClient
      locale={locale}
      dict={{
        ...dict.analyzing,
        scales: dict.scales,
        levels: dict.levels,
        common: { loading, errorNetwork, retry, continue: cont },
      }}
    />
  );
}
