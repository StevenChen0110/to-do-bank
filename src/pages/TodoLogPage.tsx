import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { addDays, format, parse } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import type { TaskPriority } from '@/types';
import { localDateString } from '@/lib/dates';
import { formatCurrency } from '@/lib/format';
import { formatPinnedGoalNarrative, isPinnedWishActive } from '@/lib/pinnedWish';
import { playDepositChime, unlockAudioFromGesture } from '@/lib/sound';
import { PRIORITY_META, PRIORITY_ORDER, taskPriority } from '@/lib/priority';
import { useAppStore } from '@/store/useAppStore';
import { useReward } from '@/context/RewardContext';
import { allCategories, labelForCategory } from '@/lib/categories';
import { QuickAddInput } from '@/components/todo/QuickAddInput';
import { TaskList } from '@/components/todo/TaskList';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type FilterStatus = 'all' | 'pending' | 'completed';
type TimeRange = 'all' | '3d' | '7d' | '30d' | 'custom';
type ViewMode = 'date' | 'category' | 'priority';

const STATUS_OPTIONS: { id: Exclude<FilterStatus, 'all'>; label: string }[] = [
  { id: 'pending', label: '未完成' },
  { id: 'completed', label: '已完成' },
];

const TIME_OPTIONS: { id: TimeRange; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: '3d', label: '前三天' },
  { id: '7d', label: '過去一週' },
  { id: '30d', label: '過去一個月' },
  { id: 'custom', label: '自訂' },
];

export function TodoLogPage() {
  const todayKey = localDateString();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState(todayKey);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('date');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<TaskPriority>('medium');

  const tasks = useAppStore((s) => s.tasks);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const completeTask = useAppStore((s) => s.completeTask);
  const addPendingTask = useAppStore((s) => s.addPendingTask);
  const settings = useAppStore((s) => s.settings);
  const wishes = useAppStore((s) => s.wishes);
  const pinnedWishId = useAppStore((s) => s.settings.pinnedWishId);
  const customCategories = useAppStore((s) => s.settings.customCategories);
  const { showToast } = useReward();

  const categoryOptions = useMemo(
    () => [{ id: 'all', label: '全部' }, ...allCategories(customCategories)],
    [customCategories],
  );

  // Resolve the effective date window from the active time range.
  const { effFrom, effTo } = useMemo(() => {
    if (timeRange === 'custom') return { effFrom: customFrom, effTo: customTo };
    if (timeRange === 'all') return { effFrom: '', effTo: '' };
    const days = timeRange === '3d' ? 3 : timeRange === '7d' ? 7 : 30;
    const today = parse(todayKey, 'yyyy-MM-dd', new Date());
    return { effFrom: localDateString(addDays(today, -(days - 1))), effTo: todayKey };
  }, [timeRange, customFrom, customTo, todayKey]);

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
        const bal = useAppStore.getState().transactions.reduce((s, tx) => s + tx.amount, 0);
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
      tasks.filter((t) => {
        if (filterCat !== 'all' && t.category !== filterCat) return false;
        if (filterStatus === 'pending' && t.completedAt !== null) return false;
        if (filterStatus === 'completed' && t.completedAt === null) return false;
        if (effFrom && t.scheduledDate < effFrom) return false;
        if (effTo && t.scheduledDate > effTo) return false;
        return true;
      }),
    [tasks, filterCat, filterStatus, effFrom, effTo],
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
    const map = new Map<string, typeof tasks>();
    for (const task of filtered) {
      if (!map.has(task.category)) map.set(task.category, []);
      map.get(task.category)!.push(task);
    }
    return [...map.entries()].sort(([, a], [, b]) => b.length - a.length);
  }, [filtered]);

  const priorityGroups = useMemo(
    () =>
      PRIORITY_ORDER.map((p) => {
        const list = filtered
          .filter((t) => taskPriority(t.priority) === p)
          // pending first, completed sink to the bottom
          .sort((a, b) => Number(a.completedAt !== null) - Number(b.completedAt !== null));
        return [p, list] as const;
      }),
    [filtered],
  );

  const submitQuick = () => {
    const title = quickTitle.trim();
    if (!title) return;
    addPendingTask(title, filterCat !== 'all' ? filterCat : 'other', todayKey, {
      priority: quickPriority,
    });
    setQuickTitle('');
  };

  function labelForDate(dk: string) {
    if (dk === todayKey) return '今日';
    return format(parse(dk, 'yyyy-MM-dd', new Date()), 'M月d日 EEEE', { locale: zhTW });
  }

  function earnedFor(group: typeof tasks) {
    return group.filter((t) => t.completedAt !== null).reduce((s, t) => s + t.reward, 0);
  }

  const isOpen = (key: string, dflt: boolean) => openMap[key] ?? dflt;
  const toggleOpen = (key: string, dflt: boolean) =>
    setOpenMap((m) => ({ ...m, [key]: !(m[key] ?? dflt) }));

  return (
    <div className="flex flex-col gap-4">
      {/* ── 新增存款 ──────────────────────────────── */}
      <section className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <button
          type="button"
          className="flex w-full items-center justify-between"
          onClick={() => setQuickAddOpen((v) => !v)}
          aria-expanded={quickAddOpen}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Plus className="h-4 w-4" />
            新增存款
          </span>
          {quickAddOpen ? (
            <ChevronUp className="h-4 w-4 text-primary/60" />
          ) : (
            <ChevronDown className="h-4 w-4 text-primary/60" />
          )}
        </button>

        {quickAddOpen && (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <label className="shrink-0 text-xs text-muted-foreground">記帳日期</label>
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

      {/* ── 待辦記錄 ──────────────────────────────── */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">待辦記錄</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* 篩選 */}
      <section className="flex flex-col gap-3">
        {/* 時間範圍 */}
        <div className="flex flex-wrap gap-2" role="group" aria-label="時間範圍">
          {TIME_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTimeRange(id)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                timeRange === id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
              aria-pressed={timeRange === id}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 自訂日期範圍 */}
        {timeRange === 'custom' && (
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs text-muted-foreground">從</span>
            <Input
              type="date"
              value={customFrom}
              max={customTo || todayKey}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-8 flex-1 text-xs"
            />
            <span className="shrink-0 text-xs text-muted-foreground">到</span>
            <Input
              type="date"
              value={customTo}
              min={customFrom}
              max={todayKey}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-8 flex-1 text-xs"
            />
          </div>
        )}

        {/* 狀態 + 分類 chips */}
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="篩選條件">
          {STATUS_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilterStatus((prev) => (prev === id ? 'all' : id))}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                filterStatus === id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
              aria-pressed={filterStatus === id}
            >
              {label}
            </button>
          ))}

          <span className="h-4 self-center border-l border-border" aria-hidden />

          {categoryOptions.map(({ id, label }) => (
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

        {/* 顯示方式 */}
        <div className="flex gap-2" role="group" aria-label="顯示方式">
          {(
            [
              { id: 'date', label: '按日期' },
              { id: 'category', label: '按分類' },
              { id: 'priority', label: '優先級' },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setViewMode(id)}
              className={cn(
                'flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                viewMode === id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground',
              )}
              aria-pressed={viewMode === id}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* ── 清單 ──────────────────────────────────── */}
      {viewMode === 'priority' ? (
        <div className="flex flex-col gap-3">
          {/* 快速新增（依優先級） */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center gap-2" role="group" aria-label="優先級">
              {PRIORITY_ORDER.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setQuickPriority(p)}
                  aria-pressed={quickPriority === p}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs font-medium transition-colors',
                    quickPriority === p
                      ? PRIORITY_META[p].chip
                      : 'border-border text-muted-foreground',
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_META[p].dot)} />
                  {PRIORITY_META[p].label}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    submitQuick();
                  }
                }}
                placeholder="快速新增待辦（記今日）"
                maxLength={200}
                className="min-h-10 flex-1"
                aria-label="快速新增待辦"
              />
              <Button
                type="button"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={submitQuick}
                disabled={!quickTitle.trim()}
                aria-label="新增待辦"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              目前沒有待辦。用上方快速新增，或調整篩選條件。
            </p>
          ) : (
            priorityGroups.map(([p, list]) =>
              list.length === 0 ? null : (
                <section key={p} className="rounded-xl border border-border bg-card p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className={cn('h-2.5 w-2.5 rounded-full', PRIORITY_META[p].dot)} />
                    <h3 className="text-sm font-semibold">{PRIORITY_META[p].label}優先</h3>
                    <span className="text-xs text-muted-foreground">{list.length}</span>
                  </div>
                  <TaskList tasks={list} onDelete={handleDelete} onComplete={handleComplete} />
                </section>
              ),
            )
          )}
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          {tasks.length === 0
            ? '尚無存款記錄。點上方「新增存款」，打勾完成後自動入帳。'
            : '目前篩選條件下無記錄。'}
        </p>
      ) : viewMode === 'date' ? (
        <div className="flex flex-col gap-3">
          {dateGroups.map(([dk, dayTasks]) => {
            const earned = earnedFor(dayTasks);
            const done = dayTasks.filter((t) => t.completedAt !== null).length;
            const open = isOpen(dk, dk === todayKey);
            return (
              <CollapsibleGroup
                key={dk}
                title={labelForDate(dk)}
                open={open}
                onToggle={() => toggleOpen(dk, dk === todayKey)}
                meta={
                  <>
                    <span className="text-muted-foreground">
                      {done}/{dayTasks.length}
                    </span>
                    {earned > 0 && (
                      <span className="font-medium text-primary">+{formatCurrency(earned)}</span>
                    )}
                  </>
                }
              >
                <TaskList
                  tasks={dayTasks}
                  onDelete={handleDelete}
                  onComplete={handleComplete}
                  emptyMessage="此日期尚無記錄。"
                />
              </CollapsibleGroup>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {categoryGroups.map(([cat, catTasks]) => {
            const earned = earnedFor(catTasks);
            const open = isOpen(`cat:${cat}`, true);
            return (
              <CollapsibleGroup
                key={cat}
                title={labelForCategory(cat, customCategories)}
                open={open}
                onToggle={() => toggleOpen(`cat:${cat}`, true)}
                meta={
                  <>
                    <span className="text-muted-foreground">{catTasks.length} 筆</span>
                    {earned > 0 && (
                      <span className="font-medium text-primary">+{formatCurrency(earned)}</span>
                    )}
                  </>
                }
              >
                <TaskList tasks={catTasks} onDelete={handleDelete} onComplete={handleComplete} />
              </CollapsibleGroup>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface CollapsibleGroupProps {
  title: string;
  meta: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

function CollapsibleGroup({ title, meta, open, onToggle, children }: CollapsibleGroupProps) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 p-4"
      >
        <span className="flex items-center gap-2">
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              !open && '-rotate-90',
            )}
          />
          <span className="text-sm font-semibold">{title}</span>
        </span>
        <span className="flex items-center gap-2 text-xs">{meta}</span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </section>
  );
}
