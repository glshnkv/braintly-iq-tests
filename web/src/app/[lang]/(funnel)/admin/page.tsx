import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  Delta,
  Funnel,
  IqHistogram,
  KpiTile,
  Legend,
  MiniStat,
  Panel,
  QuestionChart,
  SplitList,
  TrendChart,
} from "@/components/admin/AdminCharts";
import { REPORT_GRID } from "@/components/report/ReportPieces";
import { MonoLabel, Spinner } from "@/components/ui";
import { PRICING } from "@/config/product";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { resolveLocale } from "@/i18n/server";
import { formatMoney, formatNumber } from "@/lib/format";
import { getDashboard, type Dashboard } from "@/server/admin";

/** Internal tool: Russian-only on purpose. Protected by basic auth in `proxy.ts`. */
const PERIODS = [
  { days: 1, label: "24 ч" },
  { days: 7, label: "7 дней" },
  { days: 30, label: "30 дней" },
  { days: 90, label: "90 дней" },
  { days: 3650, label: "Всё время" },
];

const METHOD_LABELS: Record<string, string> = { apple_pay: "Apple Pay", google_pay: "Google Pay", card: "Карта" };

const share = (a: number, b: number) => (b > 0 ? (a / b) * 100 : null);
const pctText = (v: number | null) => (v === null ? "—" : `${Math.round(v * 10) / 10}%`);
/** Relative change in %, or null when there's nothing to compare with. */
const change = (cur: number, prev: number | undefined) => (prev === undefined || prev === 0 ? null : ((cur - prev) / prev) * 100);
/** Absolute change of a rate, in percentage points. */
const pointChange = (cur: number | null, prev: number | null | undefined) => (cur === null || prev === null || prev === undefined ? null : cur - prev);

function tickFormatter(unit: Dashboard["unit"]) {
  return (iso: string) => {
    const d = new Date(iso);
    if (unit === "hour") return `${String(d.getUTCHours()).padStart(2, "0")}:00`;
    return `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  };
}

async function DashboardView({ searchParams, locale, dict }: { searchParams: Promise<{ days?: string }>; locale: Locale; dict: Dictionary }) {
  // Live numbers: always render at request time (the dashboard reads the clock and the DB).
  await connection();
  const { days: raw } = await searchParams;
  const days = PERIODS.find((p) => String(p.days) === raw)?.days ?? 7;
  const data = await getDashboard(days);
  const { current: c, previous: p } = data;
  const money = (minor: number) => formatMoney(minor, PRICING.currency, locale);

  const rpv = c.landingViews > 0 ? c.revenueMinor / c.landingViews : null;
  const prevRpv = p && p.landingViews > 0 ? p.revenueMinor / p.landingViews : undefined;
  const paidConv = share(c.paid, c.started);
  const completion = share(c.completed, c.started);
  const leadRate = share(c.leads, c.completed);
  const unitLabel = data.unit === "hour" ? "по часам" : data.unit === "day" ? "по дням" : "по неделям";
  const compareHint = p ? "к прошлому периоду" : "сравнение недоступно";

  return (
    <div className={`${REPORT_GRID} pt-2 sm:pt-6`}>
      {/* Header */}
      <header className="flex flex-col gap-4 lg:col-span-12 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <MonoLabel muted>Braintly · аналитика</MonoLabel>
          <h1 className="mt-2 text-[2rem] font-extrabold leading-none tracking-[-0.04em]">Воронка и выручка</h1>
        </div>
        <div className="flex flex-col items-start gap-2 lg:items-end">
          <nav className="flex flex-wrap rounded-full bg-white p-1 text-[13px] font-semibold">
            {PERIODS.map((period) => (
              <Link
                key={period.days}
                href={`?days=${period.days}`}
                className={`h-8 rounded-full px-3.5 grid place-items-center transition-colors ${
                  period.days === days ? "bg-ink text-white" : "text-ink/60 hover:text-ink"
                }`}
              >
                {period.label}
              </Link>
            ))}
          </nav>
          <MonoLabel muted>
            {compareHint} · обновлено {new Date(data.generatedAt).toISOString().slice(11, 16)} UTC
          </MonoLabel>
        </div>
      </header>

      {/* North-star and key KPIs */}
      <KpiTile
        tone="ink"
        className="lg:col-span-3"
        label="Выручка на посетителя · RPV"
        value={rpv === null ? "—" : money(Math.round(rpv))}
        hint="North Star: выручка / просмотры лендинга"
        delta={<Delta value={rpv === null ? null : change(rpv, prevRpv)} onDark />}
        spark={data.series.map((s) => s.revenueMinor)}
      />
      <KpiTile
        className="lg:col-span-3"
        label="Выручка"
        value={money(c.revenueMinor)}
        hint={`${formatNumber(c.paid, locale)} оплат`}
        delta={<Delta value={change(c.revenueMinor, p?.revenueMinor)} />}
        spark={data.series.map((s) => s.revenueMinor)}
      />
      <KpiTile
        className="lg:col-span-3"
        label="Конверсия в оплату"
        value={pctText(paidConv)}
        hint="от начавших тест"
        delta={<Delta value={pointChange(paidConv, p ? share(p.paid, p.started) : undefined)} unit=" п.п." />}
        spark={data.series.map((s) => s.paid)}
      />
      <KpiTile
        className="lg:col-span-3"
        label="Начали тест"
        value={formatNumber(c.started, locale)}
        hint={`${formatNumber(c.landingViews, locale)} просмотров лендинга`}
        delta={<Delta value={change(c.started, p?.started)} />}
        spark={data.series.map((s) => s.started)}
      />

      {/* Trend + funnel */}
      <Panel className="lg:col-span-7" title={`Динамика ${unitLabel}`} meta={<Legend items={[{ tone: "bg-gray-strong", label: "Начали тест" }, { tone: "bg-orange", label: "Оплатили" }]} />}>
        <TrendChart points={data.series} formatTick={tickFormatter(data.unit)} />
      </Panel>
      <Panel className="lg:col-span-5" title="Воронка" meta={<MonoLabel muted>шаг → шаг</MonoLabel>}>
        <Funnel steps={c.steps} />
      </Panel>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-12 lg:grid-cols-6 lg:gap-4">
        <MiniStat label="Дошли до конца теста" value={pctText(completion)} delta={<Delta value={pointChange(completion, p ? share(p.completed, p.started) : undefined)} unit=" п.п." />} />
        <MiniStat label="Оставили email" value={pctText(leadRate)} delta={<Delta value={pointChange(leadRate, p ? share(p.leads, p.completed) : undefined)} unit=" п.п." />} />
        <MiniStat label="Медиана теста" value={c.medianTestMinutes === null ? "—" : `${c.medianTestMinutes} мин`} />
        <MiniStat label="Средний IQ" value={c.avgIq ?? "—"} />
        <MiniStat label="Отмены подписки" value={formatNumber(c.canceled, locale)} delta={<Delta value={change(c.canceled, p?.canceled)} invert />} />
        <MiniStat label="Отказы оплаты" value={formatNumber(c.failedPayments, locale)} delta={<Delta value={change(c.failedPayments, p?.failedPayments)} invert />} />
      </div>

      {/* Questions + IQ */}
      <Panel
        className="lg:col-span-8"
        title="Отвал и сложность по вопросам"
        meta={<Legend items={[{ tone: "bg-ink", label: "Ответили" }, { tone: "bg-orange", label: "Доля верных" }]} />}
      >
        <QuestionChart rows={data.questionReach} />
      </Panel>
      <Panel className="lg:col-span-4" title="Распределение IQ" meta={<MonoLabel muted>{formatNumber(c.completed, locale)} тестов</MonoLabel>}>
        <IqHistogram buckets={data.iqHistogram} />
      </Panel>

      {/* Splits */}
      <Panel className="lg:col-span-4" title="Типы мышления">
        <SplitList rows={data.archetypes.map((a) => ({ label: dict.archetypes[a.id].name, count: a.count }))} empty="Пока нет завершённых тестов" />
      </Panel>
      <Panel className="lg:col-span-4" title="Способы оплаты">
        <SplitList rows={data.methods.map((m) => ({ label: METHOD_LABELS[m.method] ?? m.method, count: m.count }))} empty="Пока нет оплат" />
      </Panel>
      <Panel className="lg:col-span-4" title="Источники трафика" meta={<MonoLabel muted>utm_source</MonoLabel>}>
        <SplitList rows={data.sources.map((s) => ({ label: s.source === "direct" ? "Прямые заходы" : s.source, count: s.count }))} empty="Пока нет сессий" />
      </Panel>
    </div>
  );
}

export default async function AdminPage({ searchParams }: PageProps<"/[lang]/admin">) {
  const { locale, dict } = await resolveLocale();
  return (
    <Suspense fallback={<Spinner label={dict.common.loading} />}>
      <DashboardView searchParams={searchParams as Promise<{ days?: string }>} locale={locale} dict={dict} />
    </Suspense>
  );
}
