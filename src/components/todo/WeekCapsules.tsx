import { useDroppable } from '@dnd-kit/core';
import { format, parse } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Droppable id prefix for a week capsule (drop a task onto it → move to that day). */
export const CAP_PREFIX = 'cap:';

interface WeekCapsulesProps {
  weekDates: string[];
  todayKey: string;
  focusDay: string;
  /** Pending count for a given day. */
  countFor: (dk: string) => number;
  onFocus: (dk: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  weekLabel: string;
}

function Capsule({
  dk,
  todayKey,
  focusDay,
  hasTasks,
  onFocus,
}: {
  dk: string;
  todayKey: string;
  focusDay: string;
  hasTasks: boolean;
  onFocus: (dk: string) => void;
}) {
  const isToday = dk === todayKey;
  const isFocus = dk === focusDay;
  const isPast = dk < todayKey;
  const { setNodeRef, isOver } = useDroppable({ id: `${CAP_PREFIX}${dk}` });
  const d = parse(dk, 'yyyy-MM-dd', new Date());

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onFocus(dk)}
      aria-pressed={isFocus}
      aria-label={`聚焦 ${format(d, 'M月d日 EEEE', { locale: zhTW })}${hasTasks ? '，有待辦' : ''}`}
      className={cn(
        'group relative flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 transition-all',
        isFocus
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-foreground hover:bg-muted',
        isPast && !isFocus && 'opacity-45',
        isOver && !isFocus && 'bg-primary/15 ring-2 ring-primary/50',
      )}
    >
      <span
        className={cn(
          'text-[10px] font-medium leading-none',
          isFocus ? 'text-primary-foreground/80' : 'text-muted-foreground',
        )}
      >
        {format(d, 'EEEEE', { locale: zhTW })}
      </span>
      <span
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold leading-none',
          isFocus
            ? 'text-primary-foreground'
            : isToday
              ? 'bg-primary/10 text-primary'
              : 'text-foreground',
        )}
      >
        {format(d, 'd')}
      </span>
      {/* 有無待辦：小圓點（不再顯示數字） */}
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          hasTasks
            ? isFocus
              ? 'bg-primary-foreground/80'
              : 'bg-primary'
            : 'bg-transparent',
        )}
        aria-hidden
      />
    </button>
  );
}

/** Horizontal week overview: tap a day to focus, drop a task to reschedule. */
export function WeekCapsules({
  weekDates,
  todayKey,
  focusDay,
  countFor,
  onFocus,
  onPrevWeek,
  onNextWeek,
  onToday,
  weekLabel,
}: WeekCapsulesProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-2">
      <div className="mb-1.5 flex items-center justify-between px-0.5">
        <button
          type="button"
          onClick={onPrevWeek}
          aria-label="上一週"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToday}
          className="flex items-baseline gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <span className="text-foreground">{weekLabel}</span>
          <span className="text-[11px] underline-offset-2 hover:underline">回本週</span>
        </button>
        <button
          type="button"
          onClick={onNextWeek}
          aria-label="下一週"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="flex gap-0.5">
        {weekDates.map((dk) => (
          <Capsule
            key={dk}
            dk={dk}
            todayKey={todayKey}
            focusDay={focusDay}
            hasTasks={countFor(dk) > 0}
            onFocus={onFocus}
          />
        ))}
      </div>
    </section>
  );
}
