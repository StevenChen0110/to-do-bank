import { addDays, format, parse } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import type { Habit, Task } from '@/types';
import { localDateString } from '@/lib/dates';
import { completionDates } from '@/lib/habits';
import { cn } from '@/lib/utils';

interface HabitCalendarProps {
  habit: Habit;
  tasks: Task[];
}

/** Compact day grid for one habit: completed / missed / today / off-day. */
export function HabitCalendar({ habit, tasks }: HabitCalendarProps) {
  const todayKey = localDateString();
  const today = parse(todayKey, 'yyyy-MM-dd', new Date());
  const done = completionDates(tasks, habit.id);
  const span = Math.min(Math.max(habit.targetDays, 14), 35);

  const cells = [];
  for (let i = span - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    const key = localDateString(d);
    const isToday = key === todayKey;
    const completed = done.has(key);
    const due = key >= habit.startDate && habit.weekdays.includes(d.getDay());
    cells.push({ key, d, isToday, completed, due });
  }

  return (
    <div className="flex flex-wrap gap-1" aria-label="習慣打卡紀錄">
      {cells.map(({ key, d, isToday, completed, due }) => (
        <span
          key={key}
          title={`${format(d, 'M月d日', { locale: zhTW })}${completed ? ' 已完成' : due ? ' 未完成' : ''}`}
          className={cn(
            'size-4 rounded-[3px]',
            completed
              ? 'bg-primary'
              : due
                ? 'bg-muted'
                : 'bg-muted/30',
            isToday && !completed && 'ring-2 ring-primary ring-offset-1 ring-offset-card',
          )}
        />
      ))}
    </div>
  );
}
