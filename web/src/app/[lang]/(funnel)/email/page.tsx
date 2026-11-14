import { EmailClient } from "@/components/steps/EmailClient";
import { resolveLocale } from "@/i18n/server";

export default async function EmailPage() {
  const { locale, dict } = await resolveLocale();
  const { loading, errorGeneric, errorNetwork, retry } = dict.common;
  return <EmailClient locale={locale} dict={{ ...dict.email, loading, errorGeneric, errorNetwork, retry, consent: dict.legal.email }} />;
}
