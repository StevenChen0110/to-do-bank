import { useMemo, useState, type KeyboardEvent } from 'react';
import { addDays, format, parse } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import {
  ArrowDownUp,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Plus,
  Trash2,
} from 'lucide-react';
import { localDateString } from '@/lib/dates';
import { formatCurrency } from '@/lib/format';
import { formatPinnedGoalNarrative, isPinnedWishActive } from '@/lib/pinnedWish';
import { playDepositChime, unlockAudioFromGesture } from '@/lib/sound';
import { useAppStore } from '@/store/useAppStore';
import { useReward } from '@/context/RewardContext';
import { allCategories } from '@/lib/categories';
import { QuickAddInput } from '@/components/todo/QuickAddInput';
import { TaskList } from '@/components/todo/TaskList';
import { PlanBoard } from '@/components/todo/PlanBoard';
import { TaskPanel } from '@/components/todo/TaskPanel';
import { JournalSection } from '@/components/todo/JournalSection';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TaskItem } from '@/components/todo/TaskItem';
import { cn } from '@/lib/utils';

type Mode = 'plan' | 'log';
type TimeRange = 'all' | '7d' | '30d' | 'custom';
type PlanRange = 'all' | 'today' | 'next7' | 'custom';

const TIME_OPTIONS: { id: TimeRange; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: '7d', label: '過去一週' },
  { id: '30d', label: '過去一個月' },
  { id: 'custom', label: '自訂' },
];

const PLAN_TIME_OPTIONS: { id: PlanRange; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'today', label: '今天' },
  { id: 'next7', label: '未來一週' },
  { id: 'custom', label: '自訂' },
];

export function TodoLogPage() {
  const todayKey = localDateString();
  const [mode, setMode] = useState<Mode>('plan');
  const [filterCat, setFilterCat] = useState<string>('all');

  // 計畫
  const [planDate, setPlanDate] = useState(todayKey);
  const [addOpen, setAddOpen] = useState(true);
  // 計畫 time range
  const [planRange, setPlanRange] = useState<PlanRange>('all');
  const [planFrom, setPlanFrom] = useState('');
  const [planTo, setPlanTo] = useState('');
  // 紀錄 quick-log
  const [logTitle, setLogTitle] = useState('');
  // 紀錄 time range
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  // 日期分組排序方向（兩模式各自記；計畫預設舊→新、紀錄預設新→舊）
  const [planAsc, setPlanAsc] = useState(true);
  const [logAsc, setLogAsc] = useState(false);
  const dateAsc = mode === 'plan' ? planAsc : logAsc;
  const toggleDateSort = () =>
    mode === 'plan' ? setPlanAsc((v) => !v) : setLogAsc((v) => !v);

  const tasks = useAppStore((s) => s.tasks);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const completeTask = useAppStore((s) => s.completeTask);
  const uncompleteTask = useAppStore((s) => s.uncompleteTask);
  const logCompletedTask = useAppStore((s) => s.logCompletedTask);
  const setTaskOrder = useAppStore((s) => s.setTaskOrder);
  const moveTaskToDay = useAppStore((s) => s.moveTaskToDay);
  const toggleTaskUrgent = useAppStore((s) => s.toggleTaskUrgent);
  const toggleTaskPin = useAppStore((s) => s.toggleTaskPin);
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

  const handleUncomplete = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    uncompleteTask(taskId);
    if (!task) return;
    showToast('已取消完成', 'info', `NT$${task.reward} 已從撲滿退回`);
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
    let from = '';
    let to = '';
    if (planRange === 'today') {
      from = todayKey;
      to = todayKey;
    } else if (planRange === 'next7') {
      from = todayKey;
      to = localDateString(addDays(parse(todayKey, 'yyyy-MM-dd', new Date()), 6));
    } else if (planRange === 'custom') {
      from = planFrom;
      to = planTo;
    }
    // 過期未完成的「習慣」任務改到習慣待辦區彙整，不佔逾期分組。
    // 已設為「任務」的置頂到 TaskPanel，不出現在日期分組。
    const pending = catFiltered.filter(
      (t) =>
        t.completedAt === null &&
        !t.pinned &&
        !(t.source?.type === 'habit' && t.scheduledDate < todayKey) &&
        !(from && t.scheduledDate < from) &&
        !(to && t.scheduledDate > to),
    );
    const map = new Map<string, typeof tasks>();
    for (const t of pending) {
      if (!map.has(t.scheduledDate)) map.set(t.scheduledDate, []);
      map.get(t.scheduledDate)!.push(t);
    }
    // Within each day: urgent first, then manual drag order (order asc; new last).
    for (const list of map.values()) {
      list.sort((a, b) => {
        const au = a.priority === 'high' ? 0 : 1;
        const bu = b.priority === 'high' ? 0 : 1;
        if (au !== bu) return au - bu;
        const ao = a.order ?? Number.MAX_SAFE_INTEGER;
        const bo = b.order ?? Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;
        return b.createdAt.localeCompare(a.createdAt);
      });
    }
    return [...map.entries()].sort(([a], [b]) =>
      planAsc ? a.localeCompare(b) : b.localeCompare(a),
    );
  }, [catFiltered, planAsc, todayKey, planRange, planFrom, planTo]);

  // 任務面板：已設為「任務」且未完成的待辦，緊急優先、再依日期。
  const pinnedTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.completedAt === null && t.pinned)
        .sort((a, b) => {
          const au = a.priority === 'high' ? 0 : 1;
          const bu = b.priority === 'high' ? 0 : 1;
          if (au !== bu) return au - bu;
          return a.scheduledDate.localeCompare(b.scheduledDate);
        }),
    [tasks],
  );

  // 習慣待辦「完成幾次」輸入值（key = habit refId）＋整區折疊
  const [backlogCounts, setBacklogCounts] = useState<Record<string, string>>({});
  const [backlogOpen, setBacklogOpen] = useState(true);

  /** 批次補做最舊的 n 次：每次各入帳一筆，音效與提示只出一次。 */
  const completeBacklogTimes = (list: typeof tasks, count: number) => {
    const n = Math.min(Math.max(1, count), list.length);
    unlockAudioFromGesture();
    const targets = list.slice(0, n);
    targets.forEach((t) => completeTask(t.id));
    if (settings.soundEnabled) playDepositChime();
    const total = targets.reduce((s, t) => s + t.reward, 0);
    showToast(`補做 ${n} 次 +NT$${total} 已入帳`, 'success', depositDetail());
  };

  // 習慣待辦區：過去到期仍未完成的習慣任務，依習慣彙整（最舊在前）。
  const habitBacklog = useMemo(() => {
    const missed = catFiltered.filter(
      (t) =>
        t.completedAt === null &&
        t.source?.type === 'habit' &&
        t.scheduledDate < todayKey,
    );
    const byHabit = new Map<string, typeof tasks>();
    for (const t of missed) {
      const key = t.source!.refId;
      if (!byHabit.has(key)) byHabit.set(key, []);
      byHabit.get(key)!.push(t);
    }
    return [...byHabit.values()].map((list) =>
      [...list].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)),
    );
  }, [catFiltered, todayKey]);

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
    return [...map.entries()].sort(([a], [b]) =>
      logAsc ? a.localeCompare(b) : b.localeCompare(a),
    );
  }, [catFiltered, timeRange, customFrom, customTo, todayKey, logAsc]);

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
      {/* 任務面板（置頂） */}
      <TaskPanel
        tasks={pinnedTasks}
        onComplete={handleComplete}
        onDelete={handleDelete}
        onTogglePin={toggleTaskPin}
        onToggleUrgent={toggleTaskUrgent}
        dateLabel={dateLabel}
      />

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

      {/* 分類篩選（兩模式共用）＋日期排序方向 */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="分類篩選">
        <button
          type="button"
          onClick={toggleDateSort}
          aria-label={`切換日期排序，目前${dateAsc ? '由舊到新' : '由新到舊'}`}
          className="order-last ml-auto flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <ArrowDownUp className="h-3 w-3" />
          {dateAsc ? '舊→新' : '新→舊'}
        </button>
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
          {/* 安排待辦（可折疊） */}
          <section className="rounded-xl border border-primary/30 bg-primary/5">
            <div className="flex items-center gap-2 px-4 pt-4 pb-2">
              <button
                type="button"
                onClick={() => setAddOpen((v) => !v)}
                aria-expanded={addOpen}
                className="flex items-center gap-1.5 text-sm font-semibold text-primary"
              >
                <Plus className="h-4 w-4" />
                安排待辦
              </button>
              {addOpen && (
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
              )}
              <button
                type="button"
                onClick={() => setAddOpen((v) => !v)}
                aria-expanded={addOpen}
                aria-label={addOpen ? '收合安排待辦' : '展開安排待辦'}
                className={cn('shrink-0 text-primary', !addOpen && 'ml-auto')}
              >
                <ChevronDown
                  className={cn('h-4 w-4 transition-transform', addOpen && 'rotate-180')}
                />
              </button>
            </div>
            {addOpen && (
              <div className="px-4 pb-4">
                <QuickAddInput scheduledDate={planDate} />
                <p className="mt-2 text-[11px] text-muted-foreground">
                  安排好之後到日期分組打勾完成即入帳。旗子＝緊急（浮到當天最前）、圖釘＝設為任務（置頂）。
                </p>
              </div>
            )}
          </section>

          {/* 習慣待辦區：過去沒完成的習慣彙整，可折疊；≥3 次折成一列可批次補做 */}
          {habitBacklog.length > 0 && (
            <section className="rounded-xl border border-amber-500/30 bg-amber-50/40">
              <button
                type="button"
                onClick={() => setBacklogOpen((v) => !v)}
                aria-expanded={backlogOpen}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold"
              >
                🔁 習慣待辦
                <Badge variant="outline" className="border-amber-500/50 text-amber-600">
                  {habitBacklog.reduce((s, l) => s + l.length, 0)} 次未完成
                </Badge>
                <span className="ml-auto flex items-center gap-1 text-xs font-normal text-muted-foreground">
                  補做即入帳
                  <ChevronDown
                    className={cn('h-4 w-4 transition-transform', backlogOpen && 'rotate-180')}
                  />
                </span>
              </button>

              {backlogOpen && (
                <ul className="space-y-2 px-4 pb-4">
                  {habitBacklog.map((list) => {
                    const oldest = list[0];
                    const refId = oldest.source!.refId;
                    if (list.length < 3) {
                      return list.map((t) => (
                        <TaskItem
                          key={t.id}
                          task={t}
                          onDelete={handleDelete}
                          onComplete={handleComplete}
                        />
                      ));
                    }
                    const raw = backlogCounts[refId] ?? '1';
                    const parsed = Math.min(
                      Math.max(1, Number.parseInt(raw, 10) || 1),
                      list.length,
                    );
                    return (
                      <li
                        key={refId}
                        className="rounded-lg border border-border bg-card px-3 py-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="min-w-0 flex-1 truncate text-sm font-medium">
                            {oldest.title}
                          </p>
                          <Badge
                            variant="outline"
                            className="border-amber-500/50 text-amber-600"
                          >
                            未完成 ×{list.length}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            +{formatCurrency(oldest.reward)}/次
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="shrink-0 text-xs text-muted-foreground">完成了</span>
                          <Input
                            type="number"
                            min={1}
                            max={list.length}
                            value={raw}
                            onChange={(e) =>
                              setBacklogCounts((m) => ({ ...m, [refId]: e.target.value }))
                            }
                            className="h-9 w-16 text-center text-sm"
                            aria-label={`${oldest.title} 補做次數`}
                          />
                          <span className="shrink-0 text-xs text-muted-foreground">次</span>
                          <Button
                            type="button"
                            size="sm"
                            className="h-9"
                            onClick={() => {
                              completeBacklogTimes(list, parsed);
                              setBacklogCounts((m) => ({ ...m, [refId]: '1' }));
                            }}
                          >
                            入帳 +{formatCurrency(oldest.reward * parsed)}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-auto h-9 shrink-0 text-muted-foreground"
                            onClick={() => {
                              list.forEach((t) => deleteTask(t.id));
                              showToast(
                                `已清除「${oldest.title}」未完成 ${list.length} 次`,
                                'info',
                              );
                            }}
                            aria-label={`清除 ${oldest.title} 全部未完成`}
                          >
                            <Trash2 className="h-4 w-4" />
                            清除
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}

          {/* 時間範圍 */}
          <div className="flex flex-wrap gap-2" role="group" aria-label="計畫時間範圍">
            {PLAN_TIME_OPTIONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setPlanRange(id)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  planRange === id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                )}
                aria-pressed={planRange === id}
              >
                {label}
              </button>
            ))}
          </div>
          {planRange === 'custom' && (
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs text-muted-foreground">從</span>
              <Input
                type="date"
                value={planFrom}
                max={planTo || undefined}
                onChange={(e) => setPlanFrom(e.target.value)}
                className="h-8 flex-1 text-xs"
              />
              <span className="shrink-0 text-xs text-muted-foreground">到</span>
              <Input
                type="date"
                value={planTo}
                min={planFrom || undefined}
                onChange={(e) => setPlanTo(e.target.value)}
                className="h-8 flex-1 text-xs"
              />
            </div>
          )}

          {/* 待辦清單（依日期，可拖曳跨日改期） */}
          {planGroups.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              這段期間沒有待安排的事。用上方「安排待辦」加入今天或未來要做的事。
            </p>
          ) : (
            <PlanBoard
              groups={planGroups}
              todayKey={todayKey}
              dateLabel={dateLabel}
              onDelete={handleDelete}
              onComplete={handleComplete}
              onReorder={setTaskOrder}
              onMoveToDay={moveTaskToDay}
              onToggleUrgent={toggleTaskUrgent}
              onTogglePin={toggleTaskPin}
            />
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
                    <TaskList
                      tasks={list}
                      onDelete={handleDelete}
                      onComplete={handleComplete}
                      onUncomplete={handleUncomplete}
                    />
                  </section>
                );
              })}
            </div>
          )}

          {/* 今日記事（日記併入紀錄；自動儲存＋入帳徽章） */}
          <JournalSection dateKey={todayKey} />
        </>
      )}
    </div>
  );
}
