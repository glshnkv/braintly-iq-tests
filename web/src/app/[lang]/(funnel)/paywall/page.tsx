import { PaywallClient } from "@/components/paywall/PaywallClient";
import { resolveLocale } from "@/i18n/server";

export default async function PaywallPage() {
  const { locale, dict } = await resolveLocale();
  return <PaywallClient locale={locale} dict={dict} />;
}
