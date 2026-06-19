import { useState } from 'react';
import { addDays, format, parse } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { localDateString } from '@/lib/dates';
import { JournalSection } from '@/components/todo/JournalSection';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function JournalPage() {
  const todayKey = localDateString();
  const [dateKey, setDateKey] = useState(todayKey);

  const shift = (days: number) => {
    const next = localDateString(addDays(parse(dateKey, 'yyyy-MM-dd', new Date()), days));
    if (next <= todayKey) setDateKey(next);
  };

  const isToday = dateKey === todayKey;
  const heading = isToday
    ? '今日日記'
    : format(parse(dateKey, 'yyyy-MM-dd', new Date()), 'M月d日 EEEE', { locale: zhTW });

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{heading}</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => shift(-1)}
              aria-label="前一天"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <Input
              type="date"
              value={dateKey}
              max={todayKey}
              onChange={(e) => setDateKey(e.target.value || todayKey)}
              className="h-8 w-[9.5rem] text-xs"
              aria-label="選擇日期"
            />
            <button
              type="button"
              onClick={() => shift(1)}
              disabled={isToday}
              aria-label="後一天"
              className={cn(
                'rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                isToday && 'cursor-default opacity-30 hover:bg-transparent',
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <JournalSection dateKey={dateKey} />

        {!isToday && (
          <button
            type="button"
            onClick={() => setDateKey(todayKey)}
            className="mt-3 text-xs text-primary hover:underline"
          >
            回到今天
          </button>
        )}
      </section>
    </div>
  );
}
