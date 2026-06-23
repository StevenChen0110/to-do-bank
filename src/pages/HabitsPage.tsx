import { useState, type KeyboardEvent } from 'react';
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Flame,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import type { Habit } from '@/types';
import { localDateString } from '@/lib/dates';
import { allCategories } from '@/lib/categories';
import {
  completedCount,
  dueToday,
  habitTaskFor,
  streakForHabit,
} from '@/lib/habits';
import { formatPinnedGoalNarrative, isPinnedWishActive } from '@/lib/pinnedWish';
import { playDepositChime, unlockAudioFromGesture } from '@/lib/sound';
import { useAppStore } from '@/store/useAppStore';
import { useReward } from '@/context/RewardContext';
import { HabitCalendar } from '@/components/habit/HabitCalendar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export function HabitsPage() {
  const todayKey = localDateString();
  const habits = useAppStore((s) => s.habits);
  const tasks = useAppStore((s) => s.tasks);
  const settings = useAppStore((s) => s.settings);
  const wishes = useAppStore((s) => s.wishes);
  const pinnedWishId = useAppStore((s) => s.settings.pinnedWishId);
  const customCategories = useAppStore((s) => s.settings.customCategories);
  const addHabit = useAppStore((s) => s.addHabit);
  const archiveHabit = useAppStore((s) => s.archiveHabit);
  const deleteHabit = useAppStore((s) => s.deleteHabit);
  const updateHabit = useAppStore((s) => s.updateHabit);
  const completeTask = useAppStore((s) => s.completeTask);
  const materializeHabitTasks = useAppStore((s) => s.materializeHabitTasks);
  const { showToast } = useReward();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [cue, setCue] = useState('');
  const [category, setCategory] = useState('other');
  const [reward, setReward] = useState(String(settings.smallTaskReward));
  const [targetDays, setTargetDays] = useState('21');
  const [weekdays, setWeekdays] = useState<number[]>([...ALL_DAYS]);
  const [showArchived, setShowArchived] = useState(false);

  const active = habits.filter((h) => h.active);
  const archived = habits.filter((h) => !h.active);
  const categories = allCategories(customCategories);
  const isDaily = weekdays.length === 7;

  const toggleDay = (d: number) =>
    setWeekdays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort(),
    );

  const resetForm = () => {
    setTitle('');
    setCue('');
    setCategory('other');
    setReward(String(settings.smallTaskReward));
    setTargetDays('21');
    setWeekdays([...ALL_DAYS]);
  };

  const submit = () => {
    if (!title.trim() || weekdays.length === 0) return;
    addHabit({
      title,
      cue,
      category,
      reward: Number(reward) || settings.smallTaskReward,
      weekdays,
      targetDays: Number(targetDays) || 21,
    });
    materializeHabitTasks(todayKey); // surface today's instance immediately
    resetForm();
    showToast('已建立習慣', 'success', '到「待辦」打勾即可入帳');
  };

  const onTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

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
    <div className="flex flex-col gap-4">
      {/* ── 新增習慣 ──────────────────────────────── */}
      <section className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <button
          type="button"
          className="flex w-full items-center justify-between"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Plus className="h-4 w-4" />
            新增習慣
          </span>
          {open ? (
            <ChevronUp className="h-4 w-4 text-primary/60" />
          ) : (
            <ChevronDown className="h-4 w-4 text-primary/60" />
          )}
        </button>

        {open && (
          <div className="mt-3 flex flex-col gap-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={onTitleKeyDown}
              placeholder="習慣名稱（建議微小，如「讀1頁」）"
              maxLength={60}
              className="min-h-11"
              aria-label="習慣名稱"
            />
            <p className="-mt-1 text-[11px] text-muted-foreground">
              💡 2 分鐘法則：把習慣縮到 2 分鐘內能完成，先求每天做到。
            </p>

            <Input
              value={cue}
              onChange={(e) => setCue(e.target.value)}
              placeholder="提示：在 ___ 之後（選填，如「刷牙後」）"
              maxLength={60}
              className="h-10"
              aria-label="習慣提示"
            />

            {/* 星期 */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setWeekdays([...ALL_DAYS])}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  isDaily
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground',
                )}
              >
                每天
              </button>
              {ALL_DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={cn(
                    'size-8 rounded-full border text-xs font-medium transition-colors',
                    weekdays.includes(d) && !isDaily
                      ? 'border-primary bg-primary/10 text-primary'
                      : weekdays.includes(d)
                        ? 'border-primary/30 bg-primary/5 text-primary/70'
                        : 'border-border bg-card text-muted-foreground',
                  )}
                  aria-pressed={weekdays.includes(d)}
                  aria-label={`星期${WEEKDAYS[d]}`}
                >
                  {WEEKDAYS[d]}
                </button>
              ))}
            </div>

            {/* 分類 */}
            <div className="flex flex-wrap gap-2">
              {categories.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCategory(id)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    category === id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-muted-foreground',
                  )}
                  aria-pressed={category === id}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
                每次獎勵（元）
                <Input
                  inputMode="numeric"
                  value={reward}
                  onChange={(e) => setReward(e.target.value)}
                  className="h-9"
                  aria-label="每次獎勵"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
                養成目標（天）
                <Input
                  inputMode="numeric"
                  value={targetDays}
                  onChange={(e) => setTargetDays(e.target.value)}
                  className="h-9"
                  aria-label="養成目標天數"
                />
              </label>
            </div>

            <Button
              type="button"
              className="h-11"
              onClick={submit}
              disabled={!title.trim() || weekdays.length === 0}
            >
              建立習慣
            </Button>
          </div>
        )}
      </section>

      {/* ── 習慣列表 ──────────────────────────────── */}
      {active.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          還沒有習慣。點上方「新增習慣」，每天打勾養成它，完成自動入帳。
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {active.map((habit) => {
            const streak = streakForHabit(tasks, habit.id, todayKey);
            const doneCount = completedCount(tasks, habit.id);
            const todayTask = habitTaskFor(tasks, habit.id, todayKey);
            const doneToday = todayTask?.completedAt != null;
            const due = dueToday(habit, todayKey);
            const pct = Math.min(100, Math.round((doneCount / habit.targetDays) * 100));

            return (
              <section key={habit.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  {/* 今日打勾 */}
                  <button
                    type="button"
                    onClick={() => due && !doneToday && completeHabit(habit)}
                    disabled={!due || doneToday}
                    aria-label={doneToday ? '今日已完成' : `完成 ${habit.title}`}
                    className="mt-0.5 shrink-0 text-primary disabled:cursor-default"
                  >
                    {doneToday ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : due ? (
                      <Circle className="h-6 w-6 text-muted-foreground transition-colors hover:text-primary" />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground/30" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{habit.title}</p>
                      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-orange-500">
                        <Flame className="h-3.5 w-3.5" />
                        {streak}
                      </span>
                    </div>
                    {habit.cue && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {habit.cue}後
                      </p>
                    )}
                    {!due && (
                      <p className="mt-0.5 text-xs text-muted-foreground">今天休息日</p>
                    )}
                  </div>
                </div>

                {/* 21 天進度 */}
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      第 <span className="font-semibold text-primary">{Math.min(doneCount, habit.targetDays)}</span> / {habit.targetDays} 天
                    </span>
                    <span>+{habit.reward}/次</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* 打卡格 */}
                <div className="mt-3">
                  <HabitCalendar habit={habit} tasks={tasks} />
                </div>

                {/* 動作 */}
                <div className="mt-3 flex justify-end gap-1 border-t border-border pt-2">
                  <button
                    type="button"
                    onClick={() => archiveHabit(habit.id)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    封存
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteHabit(habit.id)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    刪除
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* ── 已封存 ──────────────────────────────── */}
      {archived.length > 0 && (
        <section className="rounded-xl border border-border bg-card">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="flex w-full items-center justify-between p-4"
            aria-expanded={showArchived}
          >
            <span className="text-sm font-semibold text-muted-foreground">
              已封存（{archived.length}）
            </span>
            {showArchived ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {showArchived && (
            <ul className="flex flex-col gap-2 px-4 pb-4">
              {archived.map((habit) => (
                <li key={habit.id} className="flex items-center gap-2">
                  <span className="flex-1 truncate text-sm text-muted-foreground">
                    {habit.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateHabit(habit.id, { active: true })}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    復原
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteHabit(habit.id)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    刪除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
