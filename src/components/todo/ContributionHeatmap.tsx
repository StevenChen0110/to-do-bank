import { useMemo, useState } from 'react';
import { addDays, format, parse, startOfWeek, subWeeks } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import type { Task } from '@/types';
import { localDateString } from '@/lib/dates';
import { cn } from '@/lib/utils';

type RangeId = '1m' | '3m' | '6m' | '1y';

const RANGES: { id: RangeId; label: string; weeks: number }[] = [
  { id: '1m', label: '一個月', weeks: 5 },
  { id: '3m', label: '三個月', weeks: 13 },
  { id: '6m', label: '半年', weeks: 27 },
  { id: '1y', label: '一年', weeks: 53 },
];

interface ContributionHeatmapProps {
  tasks: Task[];
  selectedDay: string | null;
  onSelectDay: (day: string) => void;
}

function levelClass(count: number): string {
  if (count <= 0) return 'bg-muted';
  if (count === 1) return 'bg-primary/30';
  if (count <= 3) return 'bg-primary/55';
  if (count <= 5) return 'bg-primary/80';
  return 'bg-primary';
}

export function ContributionHeatmap({
  tasks,
  selectedDay,
  onSelectDay,
}: ContributionHeatmapProps) {
  const todayKey = localDateString();
  const [range, setRange] = useState<RangeId>('3m');
  const weeksCount = RANGES.find((r) => r.id === range)!.weeks;

  // Gap shrinks as the grid gets denser so it always reads cleanly.
  const gap = weeksCount <= 13 ? 4 : weeksCount <= 27 ? 3 : 2;

  // Completed tasks per scheduled date = daily "deposit" intensity.
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tasks) {
      if (t.completedAt !== null) {
        m.set(t.scheduledDate, (m.get(t.scheduledDate) ?? 0) + 1);
      }
    }
    return m;
  }, [tasks]);

  const { weeks, startDate } = useMemo(() => {
    const today = parse(todayKey, 'yyyy-MM-dd', new Date());
    const start = startOfWeek(subWeeks(today, weeksCount - 1), { weekStartsOn: 0 });
    const cols: { key: string; date: Date }[][] = [];
    for (let w = 0; w < weeksCount; w++) {
      const col: { key: string; date: Date }[] = [];
      for (let d = 0; d < 7; d++) {
        const date = addDays(start, w * 7 + d);
        col.push({ key: localDateString(date), date });
      }
      cols.push(col);
    }
    return { weeks: cols, startDate: start };
  }, [todayKey, weeksCount]);

  const total = useMemo(() => {
    let sum = 0;
    for (const col of weeks) {
      for (const { key } of col) sum += counts.get(key) ?? 0;
    }
    return sum;
  }, [weeks, counts]);

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">完成熱度</h3>
        <span className="text-xs text-muted-foreground">完成 {total} 筆</span>
      </div>

      {/* 範圍 */}
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="熱力圖時間範圍">
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

      {/* 格子 — 滿版寬度 */}
      <div className="flex" style={{ gap }}>
        {weeks.map((col, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col" style={{ gap }}>
            {col.map(({ key, date }) => {
              const future = key > todayKey;
              const count = counts.get(key) ?? 0;
              const selected = key === selectedDay;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={future}
                  onClick={() => onSelectDay(key)}
                  title={
                    future
                      ? ''
                      : `${format(date, 'M月d日', { locale: zhTW })}　完成 ${count} 筆`
                  }
                  className={cn(
                    'aspect-square w-full rounded-[2px] transition',
                    levelClass(future ? 0 : count),
                    !future && 'hover:opacity-80',
                    selected && 'ring-2 ring-primary ring-offset-1 ring-offset-card',
                  )}
                  aria-label={`${key} 完成 ${count} 筆`}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* 起訖月份 */}
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{format(startDate, 'yyyy/M月', { locale: zhTW })}</span>
        <span>今天</span>
      </div>
    </section>
  );
}
