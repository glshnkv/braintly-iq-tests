import { Header } from "@/components/Header";
import { StageBackground } from "@/components/quiz/CardStack";
import { resolveLocale } from "@/i18n/server";

/** Focused shell for the test → payment → result steps: gray grid stage, white cards on top. */
export default async function FunnelLayout({ children }: LayoutProps<"/[lang]">) {
  const { locale, dict } = await resolveLocale();
  return (
    <>
      <StageBackground />
      <Header locale={locale} languageLabel={dict.common.language} />
      <main className="flex-1 w-full max-w-[560px] mx-auto px-3 sm:px-4 pb-16 overflow-x-clip sm:overflow-x-visible">{children}</main>
    </>
  );
}
