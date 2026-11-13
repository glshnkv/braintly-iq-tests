import { Hero, SiteHeader } from "@/components/landing/Hero";
import { LandingTracker } from "@/components/landing/LandingTracker";
import { Faq, FinalCta, Footer, Honest, HowItWorks, InsideTest, ReportPreview, ThinkingTypes } from "@/components/landing/Sections";
import { resolveLocale } from "@/i18n/server";
import { getPublicQuestions } from "@/lib/quiz/public";

export default async function LandingPage() {
  const { locale, dict } = await resolveLocale();
  const questions = getPublicQuestions(locale);
  const props = { locale, dict };
  return (
    <>
      <LandingTracker locale={locale} />
      <SiteHeader {...props} />
      <main className="flex-1">
        <Hero {...props} firstQuestion={questions[0]} totalQuestions={questions.length} />
        <HowItWorks {...props} />
        <InsideTest {...props} />
        <ThinkingTypes {...props} />
        <ReportPreview {...props} />
        <Honest {...props} />
        <Faq {...props} />
        <FinalCta {...props} />
      </main>
      <Footer {...props} />
    </>
  );
}
