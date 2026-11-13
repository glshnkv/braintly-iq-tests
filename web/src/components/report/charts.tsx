import { useId, type ReactNode } from "react";
import type { DifficultyBand, ReviewItem, ScaleLevel } from "@/lib/api-types";
import { normalCdf } from "@/lib/quiz/normal";
import { SCALES, type Scale } from "@/lib/quiz/types";
import { Portrait } from "./Portrait";

/*
 * Report charts. One visual grammar for all of them: gray-soft as the "population",
 * ink as "you", orange as the accent/average, mono numerals on axes.
 */

const range = (from: number, to: number, step = 1) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* ------------------------------ distribution ------------------------------ */

const D_MIN = 55;
const D_MAX = 145;
/** Share of the population in each 1σ band: the classic IQ infographic. */
const SIGMA_BANDS: [number, number, string][] = [
  [55, 70, "2%"],
  [70, 85, "14%"],
  [85, 100, "34%"],
  [100, 115, "34%"],
  [115, 130, "14%"],
  [130, 145, "2%"],
];

/**
 * Bell curve of IQ in the population with the user's position. Unmasked: everyone below
 * the user is shaded. Masked (paywall): only a hatched zone around the estimate.
 */
export function Distribution({ iq, masked = false, youLabel }: { iq: number; masked?: boolean; youLabel: string }) {
  const uid = useId();
  const W = 360;
  const PADX = 6;
  const BASE = 132;
  const TOP = 46;
  const x = (v: number) => PADX + ((v - D_MIN) / (D_MAX - D_MIN)) * (W - 2 * PADX);
  const y = (v: number) => BASE - Math.exp(-(((v - 100) / 15) ** 2) / 2) * (BASE - TOP);
  const pts = (from: number, to: number) => range(from, to).map((v) => `${x(v).toFixed(1)},${y(v).toFixed(1)}`);
  const area = (from: number, to: number) => `M${x(from)},${BASE} L${pts(from, to).join(" L")} L${x(to)},${BASE} Z`;

  const v = clamp(Math.round(iq), D_MIN + 2, D_MAX - 2);
  const label = `${youLabel} · ${masked ? "?" : iq}`;
  const pillW = label.length * 7 + 22;
  const pillX = clamp(x(v) - pillW / 2, 0, W - pillW);
  const pillY = y(v) - 40;

  return (
    <svg viewBox={`0 0 ${W} 178`} className="w-full overflow-visible" role="img" aria-label={label}>
      <defs>
        <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--orange)" stopOpacity={0.55} />
          <stop offset="1" stopColor="var(--orange)" stopOpacity={0.12} />
        </linearGradient>
        <pattern id={`${uid}-h`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="2.2" height="6" fill="var(--orange)" />
        </pattern>
        <clipPath id={`${uid}-c`}>
          <path d={area(D_MIN, D_MAX)} />
        </clipPath>
      </defs>

      <path d={area(D_MIN, D_MAX)} fill="var(--gray-soft)" />
      {masked ? (
        <rect x={x(v - 8)} y={TOP - 10} width={x(v + 8) - x(v - 8)} height={BASE - TOP + 10} fill={`url(#${uid}-h)`} opacity={0.75} clipPath={`url(#${uid}-c)`} />
      ) : (
        <path d={area(D_MIN, v)} fill={`url(#${uid}-g)`} />
      )}
      {/* σ separators cut the area into the classic bands */}
      {[70, 85, 100, 115, 130].map((t) => (
        <line key={t} x1={x(t)} x2={x(t)} y1={BASE} y2={y(t)} stroke="var(--white)" strokeWidth={1.5} />
      ))}
      <path d={`M${pts(D_MIN, D_MAX).join(" L")}`} fill="none" stroke="var(--ink)" strokeWidth={2.25} strokeLinejoin="round" />
      <line x1={0} x2={W} y1={BASE} y2={BASE} stroke="var(--ink)" strokeOpacity={0.15} />

      {!masked && (
        <>
          <line x1={x(v)} x2={x(v)} y1={y(v)} y2={BASE} stroke="var(--ink)" strokeWidth={2} />
          <circle cx={x(v)} cy={y(v)} r={5.5} fill="var(--white)" stroke="var(--ink)" strokeWidth={2.5} />
        </>
      )}
      <g>
        <rect x={pillX} y={pillY} width={pillW} height={24} rx={12} fill={masked ? "var(--orange)" : "var(--ink)"} />
        <path d={`M${x(v) - 5},${pillY + 23} L${x(v)},${pillY + 29} L${x(v) + 5},${pillY + 23} Z`} fill={masked ? "var(--orange)" : "var(--ink)"} />
        <text x={pillX + pillW / 2} y={pillY + 16.5} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--white)">
          {label}
        </text>
      </g>

      {[70, 85, 100, 115, 130].map((t) => (
        <text key={t} x={x(t)} y={BASE + 16} textAnchor="middle" fontSize={10} fill="var(--muted)" fontFamily="var(--font-plex-mono)">
          {t}
        </text>
      ))}
      {SIGMA_BANDS.map(([a, b, share]) => (
        <text key={a} x={(x(a) + x(b)) / 2} y={BASE + 38} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--ink)" fillOpacity={0.45}>
          {share}
        </text>
      ))}
    </svg>
  );
}

/** Approximate IQ for the masked curve from the visible first digit (keeps the zone honest). */
export function approxIqFromTeaser(firstDigit: number, digitCount: number, percentileFirstDigit: number | null): number {
  if (percentileFirstDigit !== null) {
    const p = Math.min(0.99, (percentileFirstDigit * 10 + 5) / 100);
    let lo = 55;
    let hi = 145;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (normalCdf((mid - 100) / 15) < p) lo = mid;
      else hi = mid;
    }
    return lo;
  }
  return digitCount === 3 ? 100 + firstDigit * 10 : firstDigit * 10 + 5;
}

/* ------------------------------- band scale -------------------------------- */

export type BandKey = "low" | "belowAverage" | "average" | "aboveAverage" | "high" | "veryHigh";

const BANDS: { key: BandKey; from: number; to: number; tone: string }[] = [
  { key: "low", from: 55, to: 70, tone: "bg-gray" },
  { key: "belowAverage", from: 70, to: 85, tone: "bg-gray" },
  { key: "average", from: 85, to: 115, tone: "bg-gray-strong" },
  { key: "aboveAverage", from: 115, to: 130, tone: "bg-orange/45" },
  { key: "high", from: 130, to: 145, tone: "bg-orange/75" },
  { key: "veryHigh", from: 145, to: 160, tone: "bg-orange" },
];

export function bandOf(iq: number): BandKey {
  return (BANDS.find((b) => iq < b.to) ?? BANDS[BANDS.length - 1]).key;
}

/** Wechsler-style classification bar with the user's marker. */
export function IqBandScale({ iq, labels, legend = true }: { iq: number; labels: Record<BandKey, string>; legend?: boolean }) {
  const span = 160 - 55;
  const pos = ((clamp(iq, 56, 159) - 55) / span) * 100;
  const active = bandOf(iq);
  return (
    <div>
      <div className="relative pt-10">
        <span className="absolute top-0 -translate-x-1/2 flex flex-col items-center" style={{ left: `${pos}%` }}>
          <span className="rounded-full bg-ink px-2.5 py-1 font-mono text-[11px] font-medium text-white whitespace-nowrap">IQ {iq}</span>
          <span className="-mt-px size-0 border-x-[5px] border-t-[6px] border-x-transparent border-t-ink" />
        </span>
        <div className="flex h-3.5 gap-[3px]">
          {BANDS.map((b) => (
            <span
              key={b.key}
              className={`rounded-full ${b.tone} ${b.key === active ? "ring-2 ring-ink ring-offset-2 ring-offset-white" : ""}`}
              style={{ width: `${((b.to - b.from) / span) * 100}%` }}
            />
          ))}
        </div>
        <div className="relative mt-2 h-4">
          {[70, 85, 115, 130, 145].map((t) => (
            <span key={t} className="absolute -translate-x-1/2 font-mono text-[10px] text-ink/45" style={{ left: `${((t - 55) / span) * 100}%` }}>
              {t}
            </span>
          ))}
        </div>
      </div>
      {legend && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {BANDS.map((b) => (
            <span key={b.key} className={`flex items-center gap-1.5 text-[12px] font-semibold ${b.key === active ? "text-ink" : "text-ink/40"}`}>
              <span className={`size-2 rounded-full ${b.tone}`} />
              {labels[b.key]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- 100 people -------------------------------- */

function Person({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 10 16" className={className} aria-hidden>
      <circle cx="5" cy="3.3" r="3" fill="currentColor" />
      <path d="M0.8 16v-4.2A4.2 4.2 0 0 1 5 7.6a4.2 4.2 0 0 1 4.2 4.2V16z" fill="currentColor" />
    </svg>
  );
}

/** A room of 100 people: the ones the user outscores in ink, the user in orange. */
export function PeopleGrid({ percentile }: { percentile: number }) {
  const beaten = clamp(Math.floor(percentile), 0, 99);
  return (
    <div className="grid grid-cols-10 sm:grid-cols-20 gap-x-1.5 gap-y-2" role="img" aria-label={`${beaten} / 100`}>
      {range(0, 99).map((i) => (
        <Person
          key={i}
          className={`w-full h-auto ${i < beaten ? "text-ink" : i === beaten ? "text-orange scale-125" : "text-gray-strong"}`}
        />
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { tone: string; label: string; shape?: "dot" | "tick" | "dash" }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5 text-[12px] font-semibold text-ink/60">
          {it.shape === "tick" ? (
            <span className={`h-3 w-[3px] rounded-full ${it.tone}`} />
          ) : it.shape === "dash" ? (
            <span className="w-4 border-t-2 border-dashed border-ink/50" />
          ) : (
            <span className={`size-2.5 rounded-full ${it.tone}`} />
          )}
          {it.label}
        </span>
      ))}
    </div>
  );
}

/* --------------------------------- ladder ---------------------------------- */

export type LadderRow =
  | { kind: "celeb"; id: string; name: string; role: string; iq: number }
  | { kind: "average"; name: string; role: string; iq: number }
  | { kind: "you"; name: string; iq: number | null; range?: [number, number] };

const L_MIN = 60;
const L_MAX = 165;
const lPct = (iq: number) => ((clamp(iq, L_MIN, L_MAX) - L_MIN) / (L_MAX - L_MIN)) * 100;

/**
 * Famous people ranked by (popular) IQ with the user slotted in. When the score is still
 * locked, the user's row shows the honest range between the two neighbours instead.
 */
export function CelebLadder({ rows, lockedValue, compact = false }: { rows: LadderRow[]; lockedValue?: ReactNode; compact?: boolean }) {
  const sortKey = (r: LadderRow) => (r.kind === "you" ? (r.iq ?? ((r.range?.[0] ?? 100) + (r.range?.[1] ?? 100)) / 2) + 0.1 : r.iq);
  const sorted = [...rows].sort((a, b) => sortKey(b) - sortKey(a));
  return (
    <ol className="flex flex-col gap-1">
      {sorted.map((r) => {
        if (r.kind === "you") {
          return (
            <li key="you" className={`my-1 flex items-center gap-3 rounded-control bg-ink text-white ${compact ? "px-2.5 py-2" : "px-3 py-2.5"}`}>
              <span className={`grid shrink-0 place-items-center rounded-full bg-orange font-extrabold ${compact ? "size-9 text-[13px]" : "size-11 text-[15px]"}`}>{r.name}</span>
              <span className="flex-1 min-w-0">
                <span className={`relative h-2 rounded-full bg-white/10 ${compact ? "hidden" : "block"}`}>
                  {r.iq !== null ? (
                    <span className="absolute inset-y-0 left-0 rounded-full bg-orange" style={{ width: `${lPct(r.iq)}%` }} />
                  ) : (
                    r.range && (
                      <span
                        className="hatch absolute inset-y-0 rounded-full text-orange"
                        style={{ left: `${lPct(r.range[0])}%`, width: `${Math.max(lPct(r.range[1]) - lPct(r.range[0]), 6)}%` }}
                      />
                    )
                  )}
                </span>
              </span>
              <span className={`text-right font-extrabold tabular-nums tracking-[-0.03em] text-orange ${compact ? "w-10 text-base" : "w-14 text-xl"}`}>{r.iq ?? lockedValue}</span>
            </li>
          );
        }
        const isAvg = r.kind === "average";
        return (
          <li key={isAvg ? "avg" : r.id} className={`flex items-center gap-3 ${compact ? "px-2.5 py-1" : "px-3 py-1.5"}`}>
            {isAvg ? (
              <span className={`grid shrink-0 place-items-center rounded-full border-2 border-dashed border-gray-strong font-mono text-ink/50 ${compact ? "size-9 text-[10px]" : "size-11 text-[11px]"}`}>
                100
              </span>
            ) : (
              <Portrait id={r.id} name={r.name} className={compact ? "size-9" : "size-11"} />
            )}
            <span className="flex-1 min-w-0">
              <span className={`block font-bold tracking-[-0.01em] ${compact ? "line-clamp-2 text-[13px] leading-tight" : "truncate text-[15px]"}`}>{r.name}</span>
              {!compact && (
                <>
                  <span className="block truncate text-[12.5px] text-ink/45">{r.role}</span>
                  <span className="relative mt-1.5 block h-1.5 rounded-full bg-gray-soft">
                    <span className={`absolute inset-y-0 left-0 rounded-full ${isAvg ? "bg-gray-strong" : "bg-ink/80"}`} style={{ width: `${lPct(r.iq)}%` }} />
                  </span>
                </>
              )}
            </span>
            <span className={`text-right font-mono tabular-nums text-ink/70 ${compact ? "w-10 text-[13px]" : "w-14 text-[15px]"}`}>{isAvg ? "100" : `~${r.iq}`}</span>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------------------------------- radar ---------------------------------- */

const RS = 280;
const RC = RS / 2;
const RR = 92;

function rPoint(i: number, value: number, radius = RR): [number, number] {
  const a = (-90 + (360 / SCALES.length) * i) * (Math.PI / 180);
  const r = (Math.max(value, 6) / 100) * radius;
  return [RC + r * Math.cos(a), RC + r * Math.sin(a)];
}
const poly = (pts: [number, number][]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

/**
 * Five-axis profile against the average participant (dashed). `hidden` scales get blurred
 * labels and no values (paywall).
 */
export function ProfileRadar({
  scales,
  averages,
  labels,
  showValues = false,
  hidden = () => false,
}: {
  scales: Record<Scale, number>;
  averages?: Record<Scale, number>;
  labels: Record<Scale, string>;
  showValues?: boolean;
  hidden?: (s: Scale) => boolean;
}) {
  const uid = useId();
  const user = SCALES.map((s, i) => rPoint(i, scales[s]));
  return (
    <svg viewBox={`-60 -4 ${RS + 120} ${RS + 8}`} className="w-full max-w-[400px] mx-auto overflow-visible" role="img">
      <defs>
        <filter id={`${uid}-b`} x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
        <radialGradient id={`${uid}-f`}>
          <stop offset="0" stopColor="var(--orange)" stopOpacity={0.08} />
          <stop offset="1" stopColor="var(--orange)" stopOpacity={0.3} />
        </radialGradient>
      </defs>
      <polygon points={poly(SCALES.map((_, i) => rPoint(i, 100)))} fill="var(--gray-soft)" />
      {[75, 50, 25].map((k) => (
        <polygon key={k} points={poly(SCALES.map((_, i) => rPoint(i, k)))} fill="none" stroke="var(--white)" strokeWidth={1.5} />
      ))}
      {SCALES.map((_, i) => {
        const [x, y] = rPoint(i, 100);
        return <line key={i} x1={RC} y1={RC} x2={x} y2={y} stroke="var(--white)" strokeWidth={1.5} />;
      })}
      {averages && (
        <polygon
          points={poly(SCALES.map((s, i) => rPoint(i, averages[s])))}
          fill="none"
          stroke="var(--ink)"
          strokeOpacity={0.45}
          strokeWidth={1.5}
          strokeDasharray="4 4"
          strokeLinejoin="round"
        />
      )}
      <polygon points={poly(user)} fill={`url(#${uid}-f)`} stroke="var(--orange)" strokeWidth={2.5} strokeLinejoin="round" />
      {user.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={4} fill="var(--white)" stroke="var(--orange)" strokeWidth={2.5} />
      ))}
      {SCALES.map((s, i) => {
        const a = (-90 + (360 / SCALES.length) * i) * (Math.PI / 180);
        const lx = RC + (RR + 30) * Math.cos(a);
        const ly = RC + (RR + 22) * Math.sin(a) + (i === 0 ? -4 : 0);
        const off = hidden(s);
        return (
          <g key={s} filter={off ? `url(#${uid}-b)` : undefined}>
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize={13} fontWeight={700} fill="var(--ink)">
              {labels[s]}
            </text>
            {showValues && !off && (
              <text x={lx} y={ly + 16} textAnchor="middle" dominantBaseline="middle" fontSize={11.5} fill="var(--orange)" fontFamily="var(--font-plex-mono)">
                {scales[s]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ---------------------------- scale comparison ----------------------------- */

const LEVEL_TONE: Record<ScaleLevel, string> = {
  high: "bg-ink text-white",
  mid: "bg-gray-soft text-ink",
  low: "bg-orange-soft text-orange-dark",
};

/** Per-scale bars: the user's score with the average participant as an orange tick. */
export function ScaleComparison({
  scales,
  averages,
  levels,
  labels,
  levelLabels,
  vsAverage,
  insights,
}: {
  scales: Record<Scale, number>;
  averages: Record<Scale, number>;
  levels: Record<Scale, ScaleLevel>;
  labels: Record<Scale, string>;
  levelLabels: Record<ScaleLevel, string>;
  vsAverage: (delta: number) => string;
  insights?: Record<Scale, string>;
}) {
  const ordered = [...SCALES].sort((a, b) => scales[b] - scales[a]);
  return (
    <ul className="flex flex-col divide-y divide-ink/[0.07]">
      {ordered.map((s) => {
        const delta = scales[s] - averages[s];
        return (
          <li key={s} className="py-5 first:pt-0 last:pb-0">
            <div className="flex items-end justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[17px] font-bold tracking-[-0.015em]">{labels[s]}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${LEVEL_TONE[levels[s]]}`}>{levelLabels[levels[s]]}</span>
              </div>
              <span className="text-[1.6rem] font-extrabold leading-none tracking-[-0.04em] tabular-nums">
                {scales[s]}
                <span className="text-[13px] font-semibold tracking-normal text-ink/30">/100</span>
              </span>
            </div>
            <div className="relative mt-3 h-2.5 rounded-full bg-gray-soft">
              <span className="absolute inset-y-0 left-0 rounded-full bg-ink" style={{ width: `${Math.max(scales[s], 2)}%` }} />
              <span className="absolute -top-1.5 -bottom-1.5 w-1 -translate-x-1/2 rounded-full bg-orange ring-2 ring-white" style={{ left: `${averages[s]}%` }} />
            </div>
            <p className={`mt-2 text-[13px] font-semibold ${delta >= 0 ? "text-ink/70" : "text-orange-dark"}`}>
              {vsAverage(delta)}
            </p>
            {insights && <p className="mt-1.5 text-[15px] leading-relaxed text-ink/60">{insights[s]}</p>}
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------- difficulty -------------------------------- */

export function DifficultyRings({ review, labels }: { review: Pick<ReviewItem, "difficulty" | "isCorrect">[]; labels: Record<DifficultyBand, string> }) {
  const bands: DifficultyBand[] = ["easy", "medium", "hard"];
  const C = 2 * Math.PI * 30;
  return (
    <div className="grid grid-cols-3 gap-2">
      {bands.map((b) => {
        const items = review.filter((r) => r.difficulty === b);
        const ok = items.filter((r) => r.isCorrect).length;
        const share = items.length ? ok / items.length : 0;
        return (
          <div key={b} className="flex flex-col items-center gap-2 rounded-tile bg-gray-soft px-2 py-4">
            <div className="relative size-[72px]">
              <svg viewBox="0 0 76 76" className="size-full -rotate-90" aria-hidden>
                <circle cx="38" cy="38" r="30" fill="none" stroke="var(--white)" strokeWidth={8} />
                <circle
                  cx="38"
                  cy="38"
                  r="30"
                  fill="none"
                  stroke={b === "hard" ? "var(--orange)" : "var(--ink)"}
                  strokeWidth={8}
                  strokeLinecap="round"
                  strokeDasharray={`${share * C} ${C}`}
                />
              </svg>
              <span className="absolute inset-0 grid place-items-center text-[15px] font-extrabold tabular-nums">
                {ok}/{items.length}
              </span>
            </div>
            <span className="text-[13px] font-semibold text-ink/60">{labels[b]}</span>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------- time chart ------------------------------- */

export function medianSeconds(review: Pick<ReviewItem, "timeMs">[]) {
  const sorted = review.map((r) => r.timeMs / 1000).sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

/** Seconds spent on each task; wrong answers in orange, the median as a dashed line. */
export function TimeChart({ review, secondsLabel }: { review: Pick<ReviewItem, "number" | "timeMs" | "isCorrect">[]; secondsLabel: (s: number) => string }) {
  const W = 360;
  const H = 150;
  const BASE = 124;
  const TOP = 14;
  const secs = review.map((r) => r.timeMs / 1000);
  const sorted = [...secs].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const cap = Math.max(sorted[Math.floor(sorted.length * 0.9)] ?? 1, median * 2, 1);
  const n = review.length || 1;
  const slot = W / n;
  const bw = slot * 0.62;
  const h = (s: number) => (Math.min(s, cap) / cap) * (BASE - TOP);
  const my = BASE - h(median);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" role="img">
      {review.map((r, i) => {
        const bh = Math.max(3, h(r.timeMs / 1000));
        return (
          <rect key={r.number} x={i * slot + (slot - bw) / 2} y={BASE - bh} width={bw} height={bh} rx={Math.min(3, bw / 2)} fill={r.isCorrect ? "var(--ink)" : "var(--orange)"}>
            <title>{`#${r.number} · ${secondsLabel(Math.round(r.timeMs / 1000))}`}</title>
          </rect>
        );
      })}
      <line x1={0} x2={W} y1={my} y2={my} stroke="var(--ink)" strokeOpacity={0.5} strokeDasharray="4 4" />
      <line x1={0} x2={W} y1={BASE} y2={BASE} stroke="var(--ink)" strokeOpacity={0.15} />
      {review.map((r, i) =>
        r.number === 1 || r.number % 5 === 0 ? (
          <text key={r.number} x={i * slot + slot / 2} y={BASE + 16} textAnchor="middle" fontSize={10} fill="var(--muted)" fontFamily="var(--font-plex-mono)">
            {r.number}
          </text>
        ) : null,
      )}
    </svg>
  );
}
