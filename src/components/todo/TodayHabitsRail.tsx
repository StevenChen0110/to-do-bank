import { useState } from 'react';
import { CheckCircle2, ChevronDown, Circle, Flame, Repeat } from 'lucide-react';
import type { Habit } from '@/types';
import { localDateString } from '@/lib/dates';
import { dueToday, habitTaskFor, streakForHabit } from '@/lib/habits';
import { formatPinnedGoalNarrative, isPinnedWishActive } from '@/lib/pinnedWish';
import { playDepositChime, unlockAudioFromGesture } from '@/lib/sound';
import { useAppStore } from '@/store/useAppStore';
import { useReward } from '@/context/RewardContext';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/** Compact always-on lane for today's habits — kept out of the day columns. */
export function TodayHabitsRail() {
  const todayKey = localDateString();
  const habits = useAppStore((s) => s.habits);
  const tasks = useAppStore((s) => s.tasks);
  const settings = useAppStore((s) => s.settings);
  const wishes = useAppStore((s) => s.wishes);
  const pinnedWishId = useAppStore((s) => s.settings.pinnedWishId);
  const completeTask = useAppStore((s) => s.completeTask);
  const materializeHabitTasks = useAppStore((s) => s.materializeHabitTasks);
  const { showToast } = useReward();
  const [open, setOpen] = useState(true);

  const due = habits.filter((h) => h.active && dueToday(h, todayKey));
  if (due.length === 0) return null;

  const isDone = (h: Habit) => habitTaskFor(tasks, h.id, todayKey)?.completedAt != null;
  const doneCount = due.filter(isDone).length;

  const completeHabit = (habit: Habit) => {
    unlockAudioFromGesture();
    let task = habitTaskFor(tasks, habit.id, todayKey);
    if (!task) {
      materializeHabitTasks(todayKey);
      task = habitTaskFor(useAppStore.getState().tasks, habit.id, todayKey);
    }
    if (!task || task.completedAt !== null) return;
    completeTask(task.id);
    if (settings.soundEnabled) playDepositChime();
    let detail: string | undefined;
    if (isPinnedWishActive(wishes, pinnedWishId)) {
      const pinned = wishes.find((w) => w.id === pinnedWishId);
      if (pinned) {
        const bal = useAppStore.getState().transactions.reduce((s, tx) => s + tx.amount, 0);
        detail = formatPinnedGoalNarrative(pinned, bal);
      }
    }
    showToast(`+NT$${task.reward} 已入帳`, 'success', detail);
  };

  return (
    <section className="rounded-xl border border-primary/30 bg-primary/5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-primary"
      >
        <Repeat className="h-4 w-4" />
        今日習慣
        <Badge variant="outline" className="border-primary/40 text-primary">
          {doneCount}/{due.length}
        </Badge>
        <ChevronDown className={cn('ml-auto h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <ul className="space-y-1 px-4 pb-3">
          {due.map((habit) => {
            const done = isDone(habit);
            const streak = streakForHabit(tasks, habit.id, todayKey);
            return (
              <li key={habit.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => !done && completeHabit(habit)}
                  disabled={done}
                  aria-label={done ? '今日已完成' : `完成 ${habit.title}`}
                  className="shrink-0 text-primary disabled:cursor-default"
                >
                  {done ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground transition-colors hover:text-primary" />
                  )}
                </button>
                <span
                  className={cn(
                    'flex-1 truncate text-sm',
                    done && 'text-muted-foreground line-through',
                  )}
                >
                  {habit.title}
                </span>
                {streak > 0 && (
                  <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-orange-500">
                    <Flame className="h-3.5 w-3.5" />
                    {streak}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
