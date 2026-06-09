import { useMemo, useState } from 'react';
import { format, parse } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { localDateString } from '@/lib/dates';
import { formatCurrency } from '@/lib/format';
import { formatPinnedGoalNarrative, isPinnedWishActive } from '@/lib/pinnedWish';
import { playDepositChime, unlockAudioFromGesture } from '@/lib/sound';
import { useAppStore } from '@/store/useAppStore';
import { useReward } from '@/context/RewardContext';
import type { TaskCategory } from '@/types';
import { QuickAddInput } from '@/components/todo/QuickAddInput';
import { JournalSection } from '@/components/todo/JournalSection';
import { TaskList } from '@/components/todo/TaskList';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  work: '工作',
  study: '學習',
  health: '運動',
  life: '生活',
  other: '其他',
};

const FILTER_OPTIONS: { id: 'all' | TaskCategory; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'work', label: '工作' },
  { id: 'study', label: '學習' },
  { id: 'health', label: '運動' },
  { id: 'life', label: '生活' },
  { id: 'other', label: '其他' },
];

export function TodoLogPage() {
  const todayKey = localDateString();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState(todayKey);
  const [filterCat, setFilterCat] = useState<'all' | TaskCategory>('all');
  const [viewMode, setViewMode] = useState<'date' | 'category'>('date');

  const tasks = useAppStore((s) => s.tasks);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const completeTask = useAppStore((s) => s.completeTask);
  const settings = useAppStore((s) => s.settings);
  const wishes = useAppStore((s) => s.wishes);
  const pinnedWishId = useAppStore((s) => s.settings.pinnedWishId);
  const { showToast } = useReward();

  const handleComplete = (taskId: string) => {
    unlockAudioFromGesture();
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.completedAt !== null) return;
    completeTask(taskId);
    if (settings.soundEnabled) playDepositChime();

    let detail: string | undefined;
    if (isPinnedWishActive(wishes, pinnedWishId)) {
      const pinned = wishes.find((w) => w.id === pinnedWishId);
      if (pinned) {
        const bal = useAppStore
          .getState()
          .transactions.reduce((s, tx) => s + tx.amount, 0);
        detail = formatPinnedGoalNarrative(pinned, bal);
      }
    }
    showToast(`+NT$${task.reward} 已入帳`, 'success', detail);
  };

  const handleDelete = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    deleteTask(taskId);
    if (!task) return;
    showToast(
      '已刪除',
      'info',
      task.completedAt != null ? `NT$${task.reward} 已從撲滿退回` : undefined,
    );
  };

  const filtered = useMemo(
    () =>
      filterCat === 'all' ? tasks : tasks.filter((t) => t.category === filterCat),
    [tasks, filterCat],
  );

  const dateGroups = useMemo(() => {
    const map = new Map<string, typeof tasks>();
    for (const task of filtered) {
      if (!map.has(task.scheduledDate)) map.set(task.scheduledDate, []);
      map.get(task.scheduledDate)!.push(task);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const categoryGroups = useMemo(() => {
    const map = new Map<TaskCategory, typeof tasks>();
    for (const task of filtered) {
      if (!map.has(task.category)) map.set(task.category, []);
      map.get(task.category)!.push(task);
    }
    return [...map.entries()].sort(([, a], [, b]) => b.length - a.length);
  }, [filtered]);

  function labelForDate(dk: string) {
    if (dk === todayKey) return '今日';
    return format(parse(dk, 'yyyy-MM-dd', new Date()), 'M月d日 EEEE', {
      locale: zhTW,
    });
  }

  function earnedFor(group: typeof tasks) {
    return group
      .filter((t) => t.completedAt !== null)
      .reduce((s, t) => s + t.reward, 0);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── 新增存款 ──────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-4">
        <button
          type="button"
          className="flex w-full items-center justify-between"
          onClick={() => setQuickAddOpen((v) => !v)}
          aria-expanded={quickAddOpen}
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Plus className="h-4 w-4 text-primary" />
            新增存款
          </span>
          {quickAddOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {quickAddOpen && (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <label className="shrink-0 text-xs text-muted-foreground">
                記帳日期
              </label>
              <Input
                type="date"
                value={quickAddDate}
                max={todayKey}
                onChange={(e) => setQuickAddDate(e.target.value || todayKey)}
                className="h-9 flex-1"
              />
            </div>
            <QuickAddInput scheduledDate={quickAddDate} />
          </div>
        )}
      </section>

      {/* ── 篩選 ──────────────────────────────────── */}
      <section className="flex flex-col gap-2">
        <div className="flex gap-2" role="group" aria-label="顯示方式">
          {(['date', 'category'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={cn(
                'flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                viewMode === mode
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground',
              )}
              aria-pressed={viewMode === mode}
            >
              {mode === 'date' ? '按日期' : '按分類'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="分類篩選">
          {FILTER_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilterCat(id)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                filterCat === id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
              aria-pressed={filterCat === id}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* ── 存款明細清單 ────────────────────────────── */}
      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          尚無存款記錄。點上方「新增存款」，打勾完成後自動入帳。
        </p>
      ) : viewMode === 'date' ? (
        <div className="flex flex-col gap-3">
          {dateGroups.map(([dk, dayTasks]) => {
            const earned = earnedFor(dayTasks);
            return (
              <section
                key={dk}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{labelForDate(dk)}</h3>
                  {earned > 0 && (
                    <span className="text-xs font-medium text-primary">
                      +{formatCurrency(earned)}
                    </span>
                  )}
                </div>
                <TaskList
                  tasks={dayTasks}
                  onDelete={handleDelete}
                  onComplete={handleComplete}
                  emptyMessage="此日期尚無記錄。"
                />
              </section>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {categoryGroups.map(([cat, catTasks]) => {
            const earned = earnedFor(catTasks);
            return (
              <section
                key={cat}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{CATEGORY_LABELS[cat]}</h3>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">
                      {catTasks.length} 筆
                    </span>
                    {earned > 0 && (
                      <span className="font-medium text-primary">
                        +{formatCurrency(earned)}
                      </span>
                    )}
                  </div>
                </div>
                <TaskList
                  tasks={catTasks}
                  onDelete={handleDelete}
                  onComplete={handleComplete}
                />
              </section>
            );
          })}
        </div>
      )}

      {/* ── 今日日記 ──────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">今日日記</h3>
        <JournalSection dateKey={todayKey} />
      </section>
    </div>
  );
}
