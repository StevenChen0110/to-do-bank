import { useMemo, useState } from 'react';
import { addDays, format, parse, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { TrendingUp } from 'lucide-react';
import type { Transaction } from '@/types';
import { localDateString } from '@/lib/dates';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

type RangeId = '1m' | '3m' | 'all';

const RANGES: { id: RangeId; label: string }[] = [
  { id: '1m', label: '一個月' },
  { id: '3m', label: '三個月' },
  { id: 'all', label: '全部' },
];

const W = 320;
const H = 96;
const PAD_TOP = 12;
const PAD_BOTTOM = 6;

interface BalanceTrendProps {
  transactions: Transaction[];
  /** Pinned goal cost for the target line, if still climbing toward it */
  goalCost?: number;
  goalLabel?: string;
}

export function BalanceTrend({ transactions, goalCost, goalLabel }: BalanceTrendProps) {
  const todayKey = localDateString();
  const [range, setRange] = useState<RangeId>('all');

  const points = useMemo(() => {
    const deltaByDay = new Map<string, number>();
    let first = todayKey;
    for (const tx of transactions) {
      const k = localDateString(parseISO(tx.createdAt));
      deltaByDay.set(k, (deltaByDay.get(k) ?? 0) + tx.amount);
      if (k < first) first = k;
    }

    const today = parse(todayKey, 'yyyy-MM-dd', new Date());
    const startKey =
      range === 'all'
        ? first
        : localDateString(addDays(today, range === '1m' ? -29 : -89));

    let baseline = 0;
    for (const [k, v] of deltaByDay) if (k < startKey) baseline += v;

    const pts: { key: string; value: number }[] = [];
    let cum = baseline;
    for (
      let d = parse(startKey, 'yyyy-MM-dd', new Date());
      localDateString(d) <= todayKey;
      d = addDays(d, 1)
    ) {
      cum += deltaByDay.get(localDateString(d)) ?? 0;
      pts.push({ key: localDateString(d), value: cum });
    }
    return pts;
  }, [transactions, range, todayKey]);

  if (transactions.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <TrendingUp className="h-4 w-4 text-primary" />
          存款成長
        </h3>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          完成第一筆待辦後，這裡會畫出你的存款成長曲線。
        </p>
      </section>
    );
  }

  const values = points.map((p) => p.value);
  const showGoal = goalCost != null && goalCost > 0;
  const max = Math.max(...values, showGoal ? goalCost : 0, 1);
  const min = Math.min(0, ...values);
  const n = points.length;

  const x = (i: number) => (n <= 1 ? W : (i / (n - 1)) * W);
  const y = (v: number) =>
    PAD_TOP + (1 - (v - min) / (max - min || 1)) * (H - PAD_TOP - PAD_BOTTOM);

  const baseY = y(min);
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(2)} ${y(p.value).toFixed(2)}`)
    .join(' ');
  const areaPath = `${linePath} L ${x(n - 1).toFixed(2)} ${baseY.toFixed(2)} L ${x(0).toFixed(2)} ${baseY.toFixed(2)} Z`;

  const startLabel = format(
    parse(points[0].key, 'yyyy-MM-dd', new Date()),
    'yyyy/M月',
    { locale: zhTW },
  );
  const current = values[n - 1];

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <TrendingUp className="h-4 w-4 text-primary" />
          存款成長
        </h3>
        <span className="text-xs text-muted-foreground">
          目前 <span className="font-semibold text-primary">{formatCurrency(current)}</span>
        </span>
      </div>

      {/* 範圍 */}
      <div className="mb-3 flex gap-2" role="group" aria-label="成長曲線時間範圍">
        {RANGES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setRange(id)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
              range === id
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
            )}
            aria-pressed={range === id}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-24 w-full overflow-visible"
          role="img"
          aria-label={`存款成長曲線，目前 ${formatCurrency(current)}`}
        >
          <defs>
            <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {showGoal && goalCost <= max && (
            <line
              x1="0"
              x2={W}
              y1={y(goalCost)}
              y2={y(goalCost)}
              stroke="var(--color-primary)"
              strokeWidth="1"
              strokeDasharray="4 3"
              strokeOpacity="0.5"
              vectorEffect="non-scaling-stroke"
            />
          )}

          <path d={areaPath} fill="url(#balanceFill)" />
          <path
            d={linePath}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <span className="pointer-events-none absolute left-0 top-0 text-[10px] text-muted-foreground">
          {formatCurrency(max)}
        </span>
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{startLabel}</span>
        {showGoal && goalLabel && (
          <span className="truncate px-2 text-center">
            🎯 {goalLabel} {formatCurrency(goalCost)}
          </span>
        )}
        <span>今天</span>
      </div>
    </section>
  );
}
