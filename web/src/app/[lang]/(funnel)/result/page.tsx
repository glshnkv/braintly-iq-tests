import { ResultClient } from "@/components/result/ResultClient";
import { resolveLocale } from "@/i18n/server";

export default async function ResultPage() {
  const { locale, dict } = await resolveLocale();
  return <ResultClient locale={locale} dict={dict} />;
}
