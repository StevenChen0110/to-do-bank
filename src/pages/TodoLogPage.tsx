import { useMemo, useState, type ReactNode } from 'react';
import { addDays, format, parse } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { localDateString } from '@/lib/dates';
import { formatCurrency } from '@/lib/format';
import { formatPinnedGoalNarrative, isPinnedWishActive } from '@/lib/pinnedWish';
import { playDepositChime, unlockAudioFromGesture } from '@/lib/sound';
import { useAppStore } from '@/store/useAppStore';
import { useReward } from '@/context/RewardContext';
import { allCategories, labelForCategory } from '@/lib/categories';
import { ContributionHeatmap } from '@/components/todo/ContributionHeatmap';
import { QuickAddInput } from '@/components/todo/QuickAddInput';
import { TaskList } from '@/components/todo/TaskList';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type FilterStatus = 'all' | 'pending' | 'completed';
type TimeRange = 'all' | '3d' | '7d' | '30d' | 'custom';

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
  const [viewMode, setViewMode] = useState<'date' | 'category'>('date');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  const tasks = useAppStore((s) => s.tasks);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const completeTask = useAppStore((s) => s.completeTask);
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

  // A single day picked from the heatmap (custom range collapsed to one day).
  const selectedDay =
    timeRange === 'custom' && customFrom && customFrom === customTo ? customFrom : null;

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

  const handleSelectDay = (day: string) => {
    if (selectedDay === day) {
      // Toggle off → back to showing everything.
      setTimeRange('all');
      setCustomFrom('');
      setCustomTo('');
    } else {
      setTimeRange('custom');
      setCustomFrom(day);
      setCustomTo(day);
    }
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

      {/* 完成熱度 */}
      <ContributionHeatmap
        tasks={tasks}
        selectedDay={selectedDay}
        onSelectDay={handleSelectDay}
      />

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
      </section>

      {/* ── 清單 ──────────────────────────────────── */}
      {filtered.length === 0 ? (
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
