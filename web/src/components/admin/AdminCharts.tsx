import type { ReactNode } from "react";
import { MonoLabel } from "@/components/ui";

/*
 * Analytics dashboard building blocks. Same grammar as the report: gray = volume,
 * ink = the metric that matters, orange = accent / money. Pure SVG, server-rendered.
 */

const fmtInt = (n: number) => new Intl.NumberFormat("ru-RU").format(n);

/* ---------------------------------- tiles ---------------------------------- */

export function Panel({ title, meta, children, className = "" }: { title?: ReactNode; meta?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-card bg-white p-5 sm:p-6 ${className}`}>
      {(title || meta) && (
        <header className="mb-5 flex items-start justify-between gap-4">
          {title && <h2 className="text-[15px] font-bold tracking-[-0.015em]">{title}</h2>}
          {meta && <div className="shrink-0">{meta}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

/** Change vs the previous period. `invert` for metrics where growth is bad (cancellations). */
export function Delta({ value, unit = "%", invert = false, onDark = false }: { value: number | null; unit?: string; invert?: boolean; onDark?: boolean }) {
  if (value === null || !Number.isFinite(value)) {
    return <span className={`text-[12px] font-semibold ${onDark ? "text-white/35" : "text-ink/30"}`}>—</span>;
  }
  const rounded = Math.round(value * 10) / 10;
  const good = invert ? rounded <= 0 : rounded >= 0;
  const tone = rounded === 0 ? (onDark ? "bg-white/10 text-white/70" : "bg-gray-soft text-ink/60") : good ? (onDark ? "bg-white text-ink" : "bg-ink text-white") : "bg-orange-soft text-orange-dark";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold tabular-nums ${tone}`}>
      <svg aria-hidden viewBox="0 0 10 10" className={`size-2 ${rounded < 0 ? "rotate-180" : ""}`}>
        <path d="M5 1l4 7H1z" fill="currentColor" />
      </svg>
      {Math.abs(rounded)}
      {unit}
    </span>
  );
}

export function Sparkline({ values, tone = "ink" }: { values: number[]; tone?: "ink" | "white" | "orange" }) {
  const W = 120;
  const H = 32;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => [values.length > 1 ? (i / (values.length - 1)) * W : W / 2, H - 2 - (v / max) * (H - 6)] as const);
  const color = tone === "white" ? "var(--white)" : tone === "orange" ? "var(--orange)" : "var(--ink)";
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-8 w-28" aria-hidden preserveAspectRatio="none">
      <path d={`${line} L${W},${H} L0,${H} Z`} fill={color} opacity={0.12} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function KpiTile({
  label,
  value,
  hint,
  delta,
  spark,
  tone = "white",
  className = "",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  delta?: ReactNode;
  spark?: number[];
  tone?: "white" | "ink";
  className?: string;
}) {
  const dark = tone === "ink";
  return (
    <section className={`flex min-h-40 flex-col justify-between gap-5 rounded-card p-5 sm:p-6 ${dark ? "bg-ink text-white" : "bg-white"} ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <p className={`text-[13px] font-semibold ${dark ? "text-white/60" : "text-ink/55"}`}>{label}</p>
        {delta}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[2.1rem] font-extrabold leading-none tracking-[-0.05em] tabular-nums">{value}</p>
          {hint && <p className={`mt-2 text-[12px] font-medium ${dark ? "text-white/45" : "text-ink/40"}`}>{hint}</p>}
        </div>
        {spark && spark.length > 1 && <Sparkline values={spark} tone={dark ? "white" : "ink"} />}
      </div>
    </section>
  );
}

/** Compact secondary metric. */
export function MiniStat({ label, value, delta }: { label: string; value: ReactNode; delta?: ReactNode }) {
  return (
    <section className="flex min-h-28 flex-col justify-between gap-3 rounded-card bg-white p-5">
      <p className="text-[12.5px] font-semibold leading-tight text-ink/55">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-[1.5rem] font-extrabold leading-none tracking-[-0.04em] tabular-nums">{value}</p>
        {delta}
      </div>
    </section>
  );
}

export function Legend({ items }: { items: { tone: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5 text-[12px] font-semibold text-ink/55">
          <span className={`size-2.5 rounded-[3px] ${it.tone}`} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------- time series ------------------------------- */

/** Started tests (gray) with paid trials (orange) inside each bar, over time. */
export function TrendChart({ points, formatTick }: { points: { at: string; started: number; paid: number }[]; formatTick: (iso: string) => string }) {
  const W = 640;
  const H = 240;
  const PADL = 32;
  const BASE = H - 26;
  const TOP = 10;
  const max = Math.max(4, ...points.map((p) => p.started));
  const niceMax = Math.ceil(max / 4) * 4;
  const n = Math.max(points.length, 1);
  const slot = (W - PADL) / n;
  const bw = Math.max(2, Math.min(28, slot * 0.62));
  const y = (v: number) => BASE - (v / niceMax) * (BASE - TOP);
  const labelEvery = Math.max(1, Math.ceil(n / 8));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Динамика">
      {[0, 0.25, 0.5, 0.75, 1].map((k) => {
        const v = Math.round(niceMax * k);
        return (
          <g key={k}>
            <line x1={PADL} x2={W} y1={y(v)} y2={y(v)} stroke="var(--ink)" strokeOpacity={k === 0 ? 0.15 : 0.06} />
            <text x={PADL - 8} y={y(v) + 3.5} textAnchor="end" fontSize={10} fill="var(--muted)" fontFamily="var(--font-plex-mono)">
              {v}
            </text>
          </g>
        );
      })}
      {points.map((p, i) => {
        const x = PADL + i * slot + (slot - bw) / 2;
        return (
          <g key={p.at}>
            <rect x={x} y={y(p.started)} width={bw} height={Math.max(0, BASE - y(p.started))} rx={Math.min(5, bw / 2)} fill="var(--gray-strong)">
              <title>{`${formatTick(p.at)}: начали ${p.started}, оплатили ${p.paid}`}</title>
            </rect>
            {p.paid > 0 && <rect x={x} y={y(p.paid)} width={bw} height={BASE - y(p.paid)} rx={Math.min(5, bw / 2)} fill="var(--orange)" />}
            {i % labelEvery === 0 && (
              <text x={x + bw / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--muted)" fontFamily="var(--font-plex-mono)">
                {formatTick(p.at)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ---------------------------------- funnel --------------------------------- */

export function Funnel({ steps }: { steps: { key: string; label: string; count: number }[] }) {
  const top = Math.max(1, ...steps.map((s) => s.count));
  return (
    <ol className="flex flex-col gap-2.5">
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1].count : null;
        const conv = prev ? Math.round((s.count / prev) * 100) : null;
        const isLast = i === steps.length - 1;
        return (
          <li key={s.key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="truncate font-semibold text-ink/75">{s.label}</span>
              <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                {conv !== null && <span className={`font-mono text-[11px] ${conv < 50 ? "text-orange-dark" : "text-ink/40"}`}>{conv}%</span>}
                <span className="w-10 text-right font-bold">{fmtInt(s.count)}</span>
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-gray-soft">
              <div
                className={`h-full rounded-full ${isLast ? "bg-orange" : "bg-ink"}`}
                style={{ width: `${Math.max(s.count ? 1.5 : 0, (s.count / top) * 100)}%`, opacity: isLast ? 1 : 1 - i * 0.07 }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* -------------------------------- questions -------------------------------- */

/** Reach per question (bars) and share of correct answers (orange dots, right axis). */
export function QuestionChart({ rows }: { rows: { number: number; reached: number; correctPct: number | null }[] }) {
  const W = 640;
  const H = 220;
  const PADL = 32;
  const PADR = 34;
  const BASE = H - 24;
  const TOP = 10;
  const max = Math.max(4, ...rows.map((r) => r.reached));
  const niceMax = Math.ceil(max / 4) * 4;
  const slot = (W - PADL - PADR) / rows.length;
  const bw = slot * 0.6;
  const y = (v: number) => BASE - (v / niceMax) * (BASE - TOP);
  const yPct = (p: number) => BASE - (p / 100) * (BASE - TOP);
  const pts = rows
    .map((r, i) => (r.correctPct === null ? null : ([PADL + i * slot + slot / 2, yPct(r.correctPct)] as const)))
    .filter((p): p is readonly [number, number] => p !== null);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Отвал и сложность по вопросам">
      {[0, 0.5, 1].map((k) => (
        <g key={k}>
          <line x1={PADL} x2={W - PADR} y1={y(niceMax * k)} y2={y(niceMax * k)} stroke="var(--ink)" strokeOpacity={k === 0 ? 0.15 : 0.06} />
          <text x={PADL - 8} y={y(niceMax * k) + 3.5} textAnchor="end" fontSize={10} fill="var(--muted)" fontFamily="var(--font-plex-mono)">
            {Math.round(niceMax * k)}
          </text>
          <text x={W - PADR + 8} y={yPct(100 * k) + 3.5} fontSize={10} fill="var(--orange)" fontFamily="var(--font-plex-mono)">
            {100 * k}%
          </text>
        </g>
      ))}
      {rows.map((r, i) => (
        <g key={r.number}>
          <rect x={PADL + i * slot + (slot - bw) / 2} y={y(r.reached)} width={bw} height={Math.max(0, BASE - y(r.reached))} rx={3} fill="var(--ink)" fillOpacity={0.85}>
            <title>{`№${r.number}: ответили ${r.reached}, верно ${r.correctPct ?? "—"}%`}</title>
          </rect>
          {(r.number === 1 || r.number % 5 === 0) && (
            <text x={PADL + i * slot + slot / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--muted)" fontFamily="var(--font-plex-mono)">
              {r.number}
            </text>
          )}
        </g>
      ))}
      {pts.length > 1 && (
        <path d={pts.map(([x, yy], i) => `${i ? "L" : "M"}${x.toFixed(1)},${yy.toFixed(1)}`).join(" ")} fill="none" stroke="var(--orange)" strokeWidth={2} strokeLinejoin="round" />
      )}
      {pts.map(([x, yy], i) => (
        <circle key={i} cx={x} cy={yy} r={3.2} fill="var(--white)" stroke="var(--orange)" strokeWidth={2} />
      ))}
    </svg>
  );
}

/* -------------------------------- histogram -------------------------------- */

export function IqHistogram({ buckets }: { buckets: { from: number; count: number }[] }) {
  const W = 320;
  const H = 200;
  const BASE = H - 22;
  const TOP = 8;
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const slot = W / buckets.length;
  const bw = slot * 0.72;
  const x100 = buckets.findIndex((b) => b.from === 100) * slot;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Распределение IQ">
      <line x1={x100} x2={x100} y1={TOP} y2={BASE} stroke="var(--ink)" strokeOpacity={0.35} strokeDasharray="3 4" />
      <text x={x100 + 4} y={TOP + 9} fontSize={10} fill="var(--muted)" fontFamily="var(--font-plex-mono)">
        100
      </text>
      {buckets.map((b, i) => {
        const h = (b.count / max) * (BASE - TOP);
        return (
          <g key={b.from}>
            <rect x={i * slot + (slot - bw) / 2} y={BASE - h} width={bw} height={Math.max(b.count ? 3 : 0, h)} rx={3} fill={b.from >= 115 ? "var(--orange)" : "var(--ink)"}>
              <title>{`IQ ${b.from}–${b.from + 4}: ${b.count}`}</title>
            </rect>
            {b.from % 15 === 10 && (
              <text x={i * slot + slot / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--muted)" fontFamily="var(--font-plex-mono)">
                {b.from}
              </text>
            )}
          </g>
        );
      })}
      <line x1={0} x2={W} y1={BASE} y2={BASE} stroke="var(--ink)" strokeOpacity={0.15} />
    </svg>
  );
}

/* ---------------------------------- splits --------------------------------- */

export function SplitList({ rows, empty }: { rows: { label: string; count: number }[]; empty: string }) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  if (!total) return <p className="py-8 text-center text-[13px] font-medium text-ink/40">{empty}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r, i) => {
        const share = Math.round((r.count / total) * 100);
        return (
          <li key={r.label}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="truncate font-semibold">{r.label}</span>
              <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                <span className="font-mono text-[11px] text-ink/40">{fmtInt(r.count)}</span>
                <span className="w-9 text-right font-bold">{share}%</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-soft">
              <div className={`h-full rounded-full ${i === 0 ? "bg-orange" : "bg-ink/80"}`} style={{ width: `${share}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export { MonoLabel };
