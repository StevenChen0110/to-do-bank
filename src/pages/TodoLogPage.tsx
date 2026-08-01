import { useMemo, useState, type KeyboardEvent } from 'react';
import { addDays, format, parse, startOfWeek } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import {
  ArrowDownUp,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Plus,
} from 'lucide-react';
import { localDateString } from '@/lib/dates';
import { formatCurrency } from '@/lib/format';
import { formatPinnedGoalNarrative, isPinnedWishActive } from '@/lib/pinnedWish';
import { playDepositChime, unlockAudioFromGesture } from '@/lib/sound';
import { useAppStore } from '@/store/useAppStore';
import { useReward } from '@/context/RewardContext';
import { allCategories } from '@/lib/categories';
import { TaskList } from '@/components/todo/TaskList';
import { PlanBoard } from '@/components/todo/PlanBoard';
import { WeekBoard } from '@/components/todo/WeekBoard';
import { OverdueRail } from '@/components/todo/OverdueRail';
import { TodayHabitsRail } from '@/components/todo/TodayHabitsRail';
import { HabitBacklogRail } from '@/components/todo/HabitBacklogRail';
import { AddTaskBar } from '@/components/todo/AddTaskBar';
import { TaskPanel } from '@/components/todo/TaskPanel';
import { JournalSection } from '@/components/todo/JournalSection';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Mode = 'plan' | 'log';
type Lens = 'week' | 'all';
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
  const [lens, setLens] = useState<Lens>('week');
  const [filterCat, setFilterCat] = useState<string>('all');

  // 週計畫：錨定週內任一天，往前/後翻週
  const [weekAnchor, setWeekAnchor] = useState(todayKey);
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
  const addPendingTask = useAppStore((s) => s.addPendingTask);
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
        t.source?.type !== 'habit' &&
        t.scheduledDate >= todayKey &&
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

  // 逾期常駐軌：過去未完成、非習慣、未置頂（緊急優先、日期最舊在前）。
  const overdueTasks = useMemo(
    () =>
      catFiltered
        .filter(
          (t) =>
            t.completedAt === null &&
            !t.pinned &&
            t.source?.type !== 'habit' &&
            t.scheduledDate < todayKey,
        )
        .sort((a, b) => {
          const au = a.priority === 'high' ? 0 : 1;
          const bu = b.priority === 'high' ? 0 : 1;
          if (au !== bu) return au - bu;
          return a.scheduledDate.localeCompare(b.scheduledDate);
        }),
    [catFiltered, todayKey],
  );

  // 週計畫：本週（週一起）7 天的 key，與各天的待辦（緊急優先＋手動排序）。
  const weekDates = useMemo(() => {
    const start = startOfWeek(parse(weekAnchor, 'yyyy-MM-dd', new Date()), {
      weekStartsOn: 1,
    });
    return Array.from({ length: 7 }, (_, i) => localDateString(addDays(start, i)));
  }, [weekAnchor]);

  // 只顯示今天(含)以後的日子；過去的交給「逾期軌」。
  const visibleWeekDates = useMemo(
    () => weekDates.filter((dk) => dk >= todayKey),
    [weekDates, todayKey],
  );

  const weekTasksByDay = useMemo(() => {
    const set = new Set(visibleWeekDates);
    const map = new Map<string, typeof tasks>();
    for (const dk of visibleWeekDates) map.set(dk, []);
    for (const t of catFiltered) {
      if (t.completedAt !== null || t.pinned) continue;
      if (t.source?.type === 'habit') continue; // 習慣進「今日習慣」軌
      if (!set.has(t.scheduledDate)) continue;
      map.get(t.scheduledDate)!.push(t);
    }
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
    return map;
  }, [catFiltered, visibleWeekDates]);

  const weekLabel = useMemo(() => {
    const s = parse(weekDates[0], 'yyyy-MM-dd', new Date());
    const e = parse(weekDates[6], 'yyyy-MM-dd', new Date());
    return `${format(s, 'M/d')} – ${format(e, 'M/d')}`;
  }, [weekDates]);

  const shiftWeek = (delta: number) =>
    setWeekAnchor((cur) =>
      localDateString(addDays(parse(cur, 'yyyy-MM-dd', new Date()), delta * 7)),
    );

  const handleWeekAdd = (date: string, title: string) => {
    const created = addPendingTask(title, filterCat !== 'all' ? filterCat : 'other', date);
    if (created) showToast('已加入', 'success', `${format(parse(date, 'yyyy-MM-dd', new Date()), 'M/d')} 待辦`);
  };


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
            { id: 'plan', label: '計畫', icon: ClipboardList, hint: '安排與追蹤' },
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
          {/* 逾期常駐軌 */}
          {overdueTasks.length > 0 && (
            <OverdueRail
              tasks={overdueTasks}
              todayKey={todayKey}
              onComplete={handleComplete}
              onDelete={handleDelete}
              onMoveToToday={(id) => moveTaskToDay(id, todayKey, [])}
              onReschedule={(id, d) => moveTaskToDay(id, d, [])}
            />
          )}

          {/* 今日習慣（獨立軌，不混進日欄） */}
          <TodayHabitsRail />

          {/* 習慣待辦（漏做，可批次補做） */}
          <HabitBacklogRail />

          {/* 安排待辦（緊湊、預設收合） */}
          <AddTaskBar />

          {/* 鏡頭切換 */}
          <div
            className="flex gap-2 rounded-xl border border-border bg-card p-1"
            role="group"
            aria-label="鏡頭"
          >
            {(
              [
                { id: 'week', label: '本週', icon: CalendarRange },
                { id: 'all', label: '全部', icon: ClipboardList },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setLens(id)}
                aria-pressed={lens === id}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  lens === id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {lens === 'week' ? (
            <>
          {/* 週導覽 */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-2 py-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-9"
              onClick={() => shiftWeek(-1)}
              aria-label="上一週"
            >
              <ChevronLeft className="h-4 w-4" />
              上週
            </Button>
            <div className="flex flex-col items-center leading-tight">
              <span className="text-sm font-semibold">{weekLabel}</span>
              <button
                type="button"
                onClick={() => setWeekAnchor(todayKey)}
                className="text-[11px] text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
              >
                回到本週
              </button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-9"
              onClick={() => shiftWeek(1)}
              aria-label="下一週"
            >
              下週
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground">
            直接拖曳任務在各天之間移動來安排這週；每天底下可快速加事情，往「下週」翻就能規劃未來，全程不用選日期。
          </p>

          <WeekBoard
            weekDates={visibleWeekDates}
            todayKey={todayKey}
            tasksByDay={weekTasksByDay}
            onDelete={handleDelete}
            onComplete={handleComplete}
            onReorder={setTaskOrder}
            onMoveToDay={moveTaskToDay}
            onQuickAdd={handleWeekAdd}
          />
            </>
          ) : (
            <>
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
