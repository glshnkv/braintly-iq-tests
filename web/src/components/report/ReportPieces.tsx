import { useId, type ReactNode } from "react";
import { LogoMark } from "@/components/Logo";
import { LockIcon, MonoLabel, StarIcon } from "@/components/ui";
import { BRAND } from "@/config/brand";

/** Report building blocks shared by the paywall (teaser), the result page and the public certificate. */

/**
 * Report layout: one column on phones, a 12-column bento on desktop. On desktop the report
 * breaks out of the funnel's narrow column to the header's width (no transforms, so the
 * fixed pay button inside still sticks to the viewport).
 */
export const REPORT_GRID =
  "flex flex-col gap-3 lg:grid lg:grid-cols-12 lg:gap-4 " +
  "lg:relative lg:left-1/2 lg:w-[min(1104px,calc(100vw-48px))] lg:-ml-[min(552px,calc(50vw-24px))]";

/* --------------------------------- section --------------------------------- */

/** A report section: bold title, optional meta on the right (sample size, method…), content. */
export function ReportCard({
  title,
  meta,
  children,
  className = "",
}: {
  title?: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-card bg-white p-6 sm:p-8 animate-fade-up ${className}`}>
      {(title || meta) && (
        <header className="mb-6 flex items-start justify-between gap-4">
          {title && <h2 className="text-[1.3rem] sm:text-[1.45rem] font-bold leading-tight tracking-[-0.03em] text-balance">{title}</h2>}
          {meta && <MonoLabel muted className="pt-1.5 text-right shrink-0 normal-case">{meta}</MonoLabel>}
        </header>
      )}
      {children}
    </section>
  );
}

/* --------------------------------- locking --------------------------------- */

const FADE =
  "linear-gradient(to right, transparent, #000 16%, #000 84%, transparent), linear-gradient(to bottom, transparent, #000 20%, #000 80%, transparent)";

/**
 * Blurred content that dissolves into its surface: the blur comes first, then a mask fades
 * it out towards every edge — no box, no border, no halo, on any background.
 */
const LOCKED_CONTENT = {
  filter: "blur(10px)",
  maskImage: FADE,
  maskComposite: "intersect",
  WebkitMaskImage: FADE,
  WebkitMaskComposite: "source-in",
} as const;

/**
 * Locked preview with a lock badge. Callers pass PLACEHOLDER data here — real hidden values
 * never reach the browser before payment.
 */
export function Locked({ children, label, className = "" }: { children: ReactNode; label?: string; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div aria-hidden inert className="pointer-events-none select-none" style={LOCKED_CONTENT}>
        {children}
      </div>
      <div className="absolute inset-0 grid place-items-center">
        {label ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-ink py-2 pl-2 pr-4 text-[13px] font-semibold text-white shadow-lift">
            <span className="grid size-6 place-items-center rounded-full bg-white/15">
              <LockIcon className="size-3.5" />
            </span>
            {label}
          </span>
        ) : (
          <LockBadge className="size-9 shadow-lift" />
        )}
      </div>
    </div>
  );
}

/**
 * Inline blurred value ("8??%"). The text inside is a placeholder, not the real value.
 * `soft` suits big numerals; `strong` makes short text unreadable.
 */
export function BlurValue({ children = "??", strength = "soft", className = "" }: { children?: ReactNode; strength?: "soft" | "strong"; className?: string }) {
  return (
    <span aria-hidden className={`inline-block select-none ${strength === "soft" ? "blur-[0.09em]" : "blur-[8px] opacity-80"} ${className}`}>
      {children}
    </span>
  );
}

/** Small lock disc used next to blurred values. */
export function LockBadge({ className = "size-7" }: { className?: string }) {
  return (
    <span className={`inline-grid place-items-center rounded-full bg-ink text-white ${className}`}>
      <LockIcon className="size-[45%]" />
    </span>
  );
}

/* ---------------------------------- facts ---------------------------------- */

export function StatTile({ value, caption, tone = "soft" }: { value: ReactNode; caption: ReactNode; tone?: "soft" | "ink" | "orange" }) {
  const tones = { soft: "bg-gray-soft", ink: "bg-ink text-white", orange: "bg-orange text-white" };
  return (
    <div className={`flex min-h-36 flex-col justify-between gap-4 rounded-tile p-5 ${tones[tone]}`}>
      <span className="text-[2.1rem] sm:text-[2.4rem] font-extrabold leading-none tracking-[-0.05em] tabular-nums">{value}</span>
      <span className={`text-[13.5px] font-semibold leading-snug ${tone === "soft" ? "text-ink/55" : "text-white/70"}`}>{caption}</span>
    </div>
  );
}

/* --------------------------------- rarity ---------------------------------- */

/** 100 dots, `pct` of them lit: makes "7% of people" tangible. */
export function RarityDots({ pct }: { pct: number }) {
  const lit = Math.max(1, Math.min(100, Math.round(pct)));
  return (
    <div aria-hidden className="grid max-w-[480px] grid-cols-[repeat(20,minmax(0,1fr))] gap-1 sm:gap-1.5">
      {Array.from({ length: 100 }, (_, i) => (
        <span key={i} className={`aspect-square rounded-full ${i < lit ? "bg-orange" : "bg-gray"}`} />
      ))}
    </div>
  );
}

/* ------------------------------- certificate ------------------------------- */

/** Round stamp with the brand name running along its edge. */
export function Seal({ className = "" }: { className?: string }) {
  const id = useId();
  const text = `${BRAND.name} · IQ TEST · ${BRAND.name} · IQ TEST · `.toUpperCase();
  return (
    <svg aria-hidden viewBox="0 0 100 100" className={className}>
      <defs>
        <path id={id} d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0" />
      </defs>
      <circle cx="50" cy="50" r="46" fill="var(--orange)" />
      <circle cx="50" cy="50" r="28" fill="none" stroke="var(--white)" strokeOpacity={0.5} />
      <text fontSize="7.4" fontFamily="var(--font-plex-mono)" letterSpacing="1.15" fill="var(--white)">
        <textPath href={`#${id}`}>{text}</textPath>
      </text>
      <path d="M50 34c.7 7.3 4 11.2 13.3 13.3C54 49.4 50.7 53.3 50 60.6c-.7-7.3-4-11.2-13.3-13.3C46 45.2 49.3 41.3 50 34z" fill="var(--white)" transform="translate(0 2.7)" />
    </svg>
  );
}

interface CertificateLabels {
  title: string;
  issuedTo: string;
  score: string;
  type: string;
  date: string;
}

/** A certificate that reads like a document: serial, name as a signature, score, type and date. */
export function CertificateCard({
  labels,
  name,
  score,
  archetype,
  date,
  serial,
  size = "md",
}: {
  labels: CertificateLabels;
  name: ReactNode;
  score: ReactNode;
  archetype: ReactNode;
  date: ReactNode;
  serial?: string;
  size?: "md" | "lg";
}) {
  const lg = size === "lg";
  return (
    <div className={`relative overflow-hidden rounded-card bg-white ${lg ? "p-7 sm:p-10" : "p-6"}`}>
      {/* Thin inner frame — the one place a hairline is welcome: it's a document, not a container. */}
      <span aria-hidden className="pointer-events-none absolute inset-2.5 rounded-[24px] border border-ink/[0.08]" />
      <div className="relative flex items-center justify-between">
        <span className="flex items-center gap-2">
          <LogoMark className="size-6" />
          <span className="text-sm font-extrabold tracking-[-0.04em]">{BRAND.name.toLowerCase()}</span>
        </span>
        {serial && <MonoLabel muted>№ {serial}</MonoLabel>}
      </div>

      <div className={`relative flex flex-col items-center text-center ${lg ? "mt-10" : "mt-7"}`}>
        <MonoLabel className="text-orange">{labels.title}</MonoLabel>
        <span className="mt-4 text-[13px] font-medium text-ink/45">{labels.issuedTo}</span>
        <span className={`font-hand font-bold leading-none ${lg ? "text-[3.2rem]" : "text-[2.6rem]"}`}>{name}</span>
        <span className="mt-1 h-px w-40 bg-ink/15" />
        <span className="mt-6 text-[13px] font-medium text-ink/45">{labels.score}</span>
        <span className={`font-extrabold tracking-[-0.05em] leading-none tabular-nums ${lg ? "text-[6rem]" : "text-[4.5rem]"}`}>{score}</span>
      </div>

      <div className={`relative grid grid-cols-2 gap-3 ${lg ? "mt-10" : "mt-7"} pr-20`}>
        <div className="flex flex-col gap-1">
          <MonoLabel muted>{labels.type}</MonoLabel>
          <span className="font-bold">{archetype}</span>
        </div>
        <div className="flex flex-col gap-1">
          <MonoLabel muted>{labels.date}</MonoLabel>
          <span className="font-bold tabular-nums">{date}</span>
        </div>
      </div>
      <Seal className={`absolute -rotate-12 ${lg ? "right-7 bottom-7 size-24" : "right-5 bottom-5 size-20"}`} />
    </div>
  );
}

/* ------------------------------- achievements ------------------------------ */

export function AchievementList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((text) => (
        <li key={text} className="flex items-start gap-3 rounded-control bg-gray-soft px-4 py-3.5">
          <span className="mt-px grid size-6 shrink-0 place-items-center rounded-full bg-orange text-white">
            <StarIcon className="size-3" />
          </span>
          <span className="font-semibold leading-snug">{text}</span>
        </li>
      ))}
    </ul>
  );
}

/* --------------------------------- cover ----------------------------------- */

/** Document header: who the report is for, its status and date. */
export function ReportCover({
  preparedFor,
  name,
  date,
  status,
}: {
  preparedFor: string;
  name: string | null;
  date: string;
  status?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        {name && (
          <>
            <MonoLabel muted>{preparedFor}</MonoLabel>
            <p className="mt-1.5 truncate text-xl font-bold tracking-[-0.025em]">{name}</p>
          </>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        {status}
        <MonoLabel muted>{date}</MonoLabel>
      </div>
    </div>
  );
}

/** Small key figures under the cover: "25 tasks · 5 scales · 11:42". */
export function MethodStrip({ items }: { items: { value: ReactNode; label: string }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
      {items.map((it) => (
        <div key={it.label} className="rounded-control bg-gray-soft px-3.5 py-3">
          <p className="text-lg font-extrabold leading-none tracking-[-0.03em] tabular-nums">{it.value}</p>
          <p className="mt-1.5 text-[12px] font-semibold leading-tight text-ink/45">{it.label}</p>
        </div>
      ))}
    </div>
  );
}
