import { Suspense } from "react";
import { CertificateCard } from "@/components/report/ReportPieces";
import { LinkButton, Spinner } from "@/components/ui";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { resolveLocale } from "@/i18n/server";
import { formatDate } from "@/lib/format";
import { routes } from "@/lib/routes";
import { getCertificate } from "@/server/funnel";

async function Certificate({ params, locale, dict }: { params: Promise<{ shareId: string }>; locale: Locale; dict: Dictionary }) {
  const { shareId } = await params;
  const cert = /^[\w-]{6,16}$/.test(shareId) ? await getCertificate(shareId) : null;
  const c = dict.certificate;
  if (!cert) return <p className="rounded-card bg-white py-16 text-center font-semibold text-ink/50">{c.notFound}</p>;
  return (
    <div className="animate-fade-up">
      <CertificateCard
        size="lg"
        labels={c}
        name={cert.name ?? c.anonymous}
        score={cert.iq}
        archetype={dict.archetypes[cert.archetype].name}
        date={formatDate(cert.date, locale)}
        serial={shareId.toUpperCase()}
      />
    </div>
  );
}

export default async function CertificatePage({ params }: PageProps<"/[lang]/c/[shareId]">) {
  const { locale, dict } = await resolveLocale();
  return (
    <div className="flex flex-col gap-3 pt-2 sm:pt-6">
      <Suspense fallback={<Spinner label={dict.common.loading} />}>
        <Certificate params={params} locale={locale} dict={dict} />
      </Suspense>
      <LinkButton href={routes.landing(locale)} variant="accent" size="lg" block arrow>
        {dict.certificate.cta}
      </LinkButton>
      <p className="mt-2 text-label normal-case tracking-[0.02em] text-ink/40 text-center">{dict.common.disclaimer}</p>
    </div>
  );
}
