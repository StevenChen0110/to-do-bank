import { CheckCircle2, Circle, Flame, Repeat } from 'lucide-react';
import type { Habit } from '@/types';
import { localDateString } from '@/lib/dates';
import { dueToday, habitTaskFor, streakForHabit } from '@/lib/habits';
import { formatPinnedGoalNarrative, isPinnedWishActive } from '@/lib/pinnedWish';
import { playDepositChime, unlockAudioFromGesture } from '@/lib/sound';
import { useAppStore } from '@/store/useAppStore';
import { useReward } from '@/context/RewardContext';
import { formatCurrency } from '@/lib/format';

interface HabitsOverviewProps {
  onNavigate: () => void;
}

/** Home-page overview of today's habits: done vs. not done, streaks, quick tick. */
export function HabitsOverview({ onNavigate }: HabitsOverviewProps) {
  const todayKey = localDateString();
  const habits = useAppStore((s) => s.habits);
  const tasks = useAppStore((s) => s.tasks);
  const settings = useAppStore((s) => s.settings);
  const wishes = useAppStore((s) => s.wishes);
  const pinnedWishId = useAppStore((s) => s.settings.pinnedWishId);
  const completeTask = useAppStore((s) => s.completeTask);
  const materializeHabitTasks = useAppStore((s) => s.materializeHabitTasks);
  const { showToast } = useReward();

  const active = habits.filter((h) => h.active);
  if (active.length === 0) return null;

  const due = active.filter((h) => dueToday(h, todayKey));
  const isDone = (h: Habit) => habitTaskFor(tasks, h.id, todayKey)?.completedAt != null;
  const pendingHabits = due.filter((h) => !isDone(h));
  const doneHabits = due.filter((h) => isDone(h));
  const total = due.length;
  const doneCount = doneHabits.length;
  const restCount = active.length - total;
  const progressPct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

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
    <section className="rounded-xl border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Repeat className="h-4 w-4 text-primary" />
          習慣總覽
        </h2>
        <div className="flex items-center gap-2">
          {total > 0 && (
            <span className="text-xs text-muted-foreground">
              已完成 <span className="font-semibold text-primary">{doneCount}</span>
              <span className="mx-1 opacity-50">·</span>
              未完成 <span className="font-semibold text-orange-500">{pendingHabits.length}</span>
            </span>
          )}
          <button
            type="button"
            onClick={onNavigate}
            className="flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary active:scale-95"
            aria-label="前往習慣頁"
          >
            <Repeat className="h-3 w-3" />
            管理
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mx-4 mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {/* Body */}
      <div className="px-4 pb-1">
        {total === 0 ? (
          <p className="pb-3 text-sm text-muted-foreground">
            今天沒有排定的習慣{restCount > 0 ? '（都是休息日）' : ''}。
          </p>
        ) : (
          <ul className="space-y-1.5">
            {/* Pending — tappable */}
            {pendingHabits.map((habit) => {
              const streak = streakForHabit(tasks, habit.id, todayKey);
              return (
                <li key={habit.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => completeHabit(habit)}
                    aria-label={`完成 ${habit.title}`}
                    className="shrink-0 text-muted-foreground transition-colors hover:text-primary active:scale-90"
                  >
                    <Circle className="h-4 w-4" />
                  </button>
                  <span className="flex-1 truncate text-sm">{habit.title}</span>
                  {streak > 0 && (
                    <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-orange-500">
                      <Flame className="h-3.5 w-3.5" />
                      {streak}
                    </span>
                  )}
                  <span className="shrink-0 text-xs text-muted-foreground">
                    +{formatCurrency(habit.reward)}
                  </span>
                </li>
              );
            })}

            {/* Divider */}
            {pendingHabits.length > 0 && doneHabits.length > 0 && (
              <li aria-hidden className="border-t border-border pt-0.5" />
            )}

            {/* Done */}
            {doneHabits.map((habit) => {
              const streak = streakForHabit(tasks, habit.id, todayKey);
              return (
                <li key={habit.id} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  <span className="flex-1 truncate text-sm text-muted-foreground line-through">
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
      </div>

      {/* Footer */}
      <div className="mt-2 flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
        <span>共 {active.length} 個習慣</span>
        {restCount > 0 && total > 0 && <span>{restCount} 個今天休息</span>}
      </div>
    </section>
  );
}
