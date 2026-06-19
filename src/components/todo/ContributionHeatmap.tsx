import { useEffect, useMemo, useRef } from 'react';
import { addDays, format, parse, startOfWeek, subWeeks } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import type { Task } from '@/types';
import { localDateString } from '@/lib/dates';
import { cn } from '@/lib/utils';

const WEEKS = 26; // ~6 months
// Rows are Sun..Sat; only label Mon / Wed / Fri like GitHub.
const WEEKDAY_LABELS = ['', '一', '', '三', '', '五', ''];

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
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const weeks = useMemo(() => {
    const today = parse(todayKey, 'yyyy-MM-dd', new Date());
    const start = startOfWeek(subWeeks(today, WEEKS - 1), { weekStartsOn: 0 });
    const cols: { key: string; date: Date }[][] = [];
    for (let w = 0; w < WEEKS; w++) {
      const col: { key: string; date: Date }[] = [];
      for (let d = 0; d < 7; d++) {
        const date = addDays(start, w * 7 + d);
        col.push({ key: localDateString(date), date });
      }
      cols.push(col);
    }
    return cols;
  }, [todayKey]);

  const monthLabels = useMemo(
    () =>
      weeks.map((col, i) => {
        const first = col[0].date;
        const prevFirst = i > 0 ? weeks[i - 1][0].date : null;
        if (!prevFirst || first.getMonth() !== prevFirst.getMonth()) {
          return format(first, 'M月', { locale: zhTW });
        }
        return '';
      }),
    [weeks],
  );

  const total = useMemo(
    () => [...counts.values()].reduce((a, b) => a + b, 0),
    [counts],
  );

  // Anchor scroll to the most recent week on mount.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">完成熱度</h3>
        <span className="text-xs text-muted-foreground">
          近 {WEEKS} 週完成 {total} 筆
        </span>
      </div>

      <div ref={scrollRef} className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1">
          {/* Month labels */}
          <div className="flex gap-[3px] pl-4">
            {monthLabels.map((m, i) => (
              <div key={i} className="w-[11px] text-[9px] text-muted-foreground">
                {m && <span className="whitespace-nowrap">{m}</span>}
              </div>
            ))}
          </div>

          <div className="flex gap-[3px]">
            {/* Weekday labels */}
            <div className="flex flex-col gap-[3px] pr-1">
              {WEEKDAY_LABELS.map((l, i) => (
                <div
                  key={i}
                  className="h-[11px] w-3 text-[9px] leading-[11px] text-muted-foreground"
                >
                  {l}
                </div>
              ))}
            </div>

            {/* Week columns */}
            {weeks.map((col, i) => (
              <div key={i} className="flex flex-col gap-[3px]">
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
                        'size-[11px] rounded-[2px] transition',
                        future ? 'bg-transparent' : levelClass(count),
                        !future && 'hover:opacity-80',
                        selected &&
                          'ring-2 ring-primary ring-offset-1 ring-offset-card',
                      )}
                      aria-label={`${key} 完成 ${count} 筆`}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-1 pt-1 text-[9px] text-muted-foreground">
            少
            <span className="size-[11px] rounded-[2px] bg-muted" />
            <span className="size-[11px] rounded-[2px] bg-primary/30" />
            <span className="size-[11px] rounded-[2px] bg-primary/55" />
            <span className="size-[11px] rounded-[2px] bg-primary/80" />
            <span className="size-[11px] rounded-[2px] bg-primary" />
            多
          </div>
        </div>
      </div>
    </section>
  );
}
