import { useMemo, useState, type KeyboardEvent } from 'react';
import { addDays, format, parse } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { CalendarDays, ClipboardList, Plus } from 'lucide-react';
import { localDateString } from '@/lib/dates';
import { formatCurrency } from '@/lib/format';
import { formatPinnedGoalNarrative, isPinnedWishActive } from '@/lib/pinnedWish';
import { playDepositChime, unlockAudioFromGesture } from '@/lib/sound';
import { useAppStore } from '@/store/useAppStore';
import { useReward } from '@/context/RewardContext';
import { allCategories } from '@/lib/categories';
import { QuickAddInput } from '@/components/todo/QuickAddInput';
import { TaskList } from '@/components/todo/TaskList';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Mode = 'plan' | 'log';
type TimeRange = 'all' | '7d' | '30d' | 'custom';

const TIME_OPTIONS: { id: TimeRange; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: '7d', label: '過去一週' },
  { id: '30d', label: '過去一個月' },
  { id: 'custom', label: '自訂' },
];

export function TodoLogPage() {
  const todayKey = localDateString();
  const [mode, setMode] = useState<Mode>('plan');
  const [filterCat, setFilterCat] = useState<string>('all');

  // 計畫
  const [planDate, setPlanDate] = useState(todayKey);
  // 紀錄 quick-log
  const [logTitle, setLogTitle] = useState('');
  // 紀錄 time range
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const tasks = useAppStore((s) => s.tasks);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const completeTask = useAppStore((s) => s.completeTask);
  const logCompletedTask = useAppStore((s) => s.logCompletedTask);
  const settings = useAppStore((s) => s.settings);
  const wishes = useAppStore((s) => s.wishes);
  const pinnedWishId = useAppStore((s) => s.settings.pinnedWishId);
  const customCategories = useAppStore((s) => s.settings.customCategories);
  const { showToast } = useReward();

  const categoryOptions = useMemo(
    () => [{ id: 'all', label: '全部' }, ...allCategories(customCategories)],
    [customCategories],
  );

  const depositDetail = (): string | undefined => {
    if (!isPinnedWishActive(wishes, pinnedWishId)) return undefined;
    const pinned = wishes.find((w) => w.id === pinnedWishId);
    if (!pinned) return undefined;
    const bal = useAppStore.getState().transactions.reduce((s, tx) => s + tx.amount, 0);
    return formatPinnedGoalNarrative(pinned, bal);
  };

  const handleComplete = (taskId: string) => {
    unlockAudioFromGesture();
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.completedAt !== null) return;
    completeTask(taskId);
    if (settings.soundEnabled) playDepositChime();
    showToast(`+NT$${task.reward} 已入帳`, 'success', depositDetail());
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

  // 紀錄：補記剛完成的事 → 立即入帳
  const submitLog = () => {
    const title = logTitle.trim();
    if (!title) return;
    unlockAudioFromGesture();
    const created = logCompletedTask(title, filterCat !== 'all' ? filterCat : 'other', todayKey);
    if (!created) return;
    if (settings.soundEnabled) playDepositChime();
    showToast(`+NT$${created.reward} 已入帳`, 'success', depositDetail());
    setLogTitle('');
  };

  const catFiltered = useMemo(
    () => (filterCat === 'all' ? tasks : tasks.filter((t) => t.category === filterCat)),
    [tasks, filterCat],
  );

  // 計畫：未完成，依日期分組（逾期→今日→未來）
  const planGroups = useMemo(() => {
    const pending = catFiltered.filter((t) => t.completedAt === null);
    const map = new Map<string, typeof tasks>();
    for (const t of pending) {
      if (!map.has(t.scheduledDate)) map.set(t.scheduledDate, []);
      map.get(t.scheduledDate)!.push(t);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [catFiltered]);

  // 紀錄：已完成，套時間範圍，依日期新到舊
  const logGroups = useMemo(() => {
    let from = '';
    let to = '';
    if (timeRange === 'custom') {
      from = customFrom;
      to = customTo;
    } else if (timeRange !== 'all') {
      const days = timeRange === '7d' ? 7 : 30;
      from = localDateString(addDays(parse(todayKey, 'yyyy-MM-dd', new Date()), -(days - 1)));
      to = todayKey;
    }
    const done = catFiltered.filter((t) => {
      if (t.completedAt === null) return false;
      if (from && t.scheduledDate < from) return false;
      if (to && t.scheduledDate > to) return false;
      return true;
    });
    const map = new Map<string, typeof tasks>();
    for (const t of done) {
      if (!map.has(t.scheduledDate)) map.set(t.scheduledDate, []);
      map.get(t.scheduledDate)!.push(t);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [catFiltered, timeRange, customFrom, customTo, todayKey]);

  function dateLabel(dk: string): string {
    if (dk === todayKey) return '今日';
    const tomorrow = localDateString(addDays(parse(todayKey, 'yyyy-MM-dd', new Date()), 1));
    const yesterday = localDateString(addDays(parse(todayKey, 'yyyy-MM-dd', new Date()), -1));
    if (dk === tomorrow) return '明天';
    if (dk === yesterday) return '昨天';
    return format(parse(dk, 'yyyy-MM-dd', new Date()), 'M月d日 EEEE', { locale: zhTW });
  }

  const earnedFor = (group: typeof tasks) =>
    group.filter((t) => t.completedAt !== null).reduce((s, t) => s + t.reward, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* 模式切換 */}
      <div className="flex gap-2 rounded-xl border border-border bg-card p-1" role="group" aria-label="模式">
        {(
          [
            { id: 'plan', label: '計畫', icon: ClipboardList, hint: '安排要做的事' },
            { id: 'log', label: '紀錄', icon: CalendarDays, hint: '記下做過的事' },
          ] as const
        ).map(({ id, label, icon: Icon, hint }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            aria-pressed={mode === id}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              mode === id
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
            <span className="hidden text-[10px] font-normal opacity-70 sm:inline">· {hint}</span>
          </button>
        ))}
      </div>

      {/* 分類篩選（兩模式共用） */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="分類篩選">
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

      {mode === 'plan' ? (
        <>
          {/* 安排待辦 */}
          <section className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                <Plus className="h-4 w-4" />
                安排待辦
              </span>
              <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                安排到
                <Input
                  type="date"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value || todayKey)}
                  className="h-8 w-[8.5rem] text-xs"
                  aria-label="安排日期"
                />
              </span>
            </div>
            <QuickAddInput scheduledDate={planDate} />
            <p className="mt-2 text-[11px] text-muted-foreground">
              安排好之後到日期分組打勾完成即入帳。任務卡上的標籤可調優先級。
            </p>
          </section>

          {/* 待辦清單（依日期） */}
          {planGroups.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              目前沒有待安排的事。用上方「安排待辦」加入今天或未來要做的事。
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {planGroups.map(([dk, list]) => {
                const overdue = dk < todayKey;
                return (
                  <section key={dk} className="rounded-xl border border-border bg-card p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3
                        className={cn(
                          'text-sm font-semibold',
                          overdue && 'text-amber-600',
                        )}
                      >
                        {overdue && '逾期 · '}
                        {dateLabel(dk)}
                      </h3>
                      <span className="text-xs text-muted-foreground">{list.length} 件</span>
                    </div>
                    <TaskList tasks={list} onDelete={handleDelete} onComplete={handleComplete} />
                  </section>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          {/* 補記剛完成 */}
          <section className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-primary">
              <Plus className="h-4 w-4" />
              補記剛完成的事
            </div>
            <div className="flex gap-2">
              <Input
                value={logTitle}
                onChange={(e) => setLogTitle(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    submitLog();
                  }
                }}
                placeholder="剛做了什麼？記下立即入帳"
                maxLength={200}
                className="min-h-11 flex-1"
                aria-label="補記完成的事"
              />
              <Button
                type="button"
                size="icon"
                className="h-11 w-11 shrink-0"
                onClick={submitLog}
                disabled={!logTitle.trim()}
                aria-label="記錄並入帳"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </section>

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

          {/* 完成時間軸 */}
          {logGroups.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              這段時間還沒有完成記錄。完成「計畫」裡的待辦，或用上方補記。
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {logGroups.map(([dk, list]) => {
                const earned = earnedFor(list);
                return (
                  <section key={dk} className="rounded-xl border border-border bg-card p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold">{dateLabel(dk)}</h3>
                      <span className="text-xs font-medium text-primary">
                        +{formatCurrency(earned)}
                      </span>
                    </div>
                    <TaskList tasks={list} onDelete={handleDelete} onComplete={handleComplete} />
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
