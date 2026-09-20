import { useMemo, useState, type KeyboardEvent } from 'react';
import { addDays, format, parse, startOfWeek } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import {
  ArrowDownUp,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  Eye,
  EyeOff,
  Plus,
} from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { localDateString } from '@/lib/dates';
import { formatCurrency } from '@/lib/format';
import { formatPinnedGoalNarrative, isPinnedWishActive } from '@/lib/pinnedWish';
import { playDepositChime, unlockAudioFromGesture } from '@/lib/sound';
import { useAppStore } from '@/store/useAppStore';
import { useReward } from '@/context/RewardContext';
import { allCategories } from '@/lib/categories';
import { TaskList } from '@/components/todo/TaskList';
import { TaskItem } from '@/components/todo/TaskItem';
import { PlanBoard } from '@/components/todo/PlanBoard';
import { WeekGrid, DAY_PREFIX } from '@/components/todo/WeekBoard';
import { WeekCapsules, CAP_PREFIX } from '@/components/todo/WeekCapsules';
import { OverdueRail, STAGING_ID } from '@/components/todo/OverdueRail';
import { QuickAddFab } from '@/components/todo/QuickAddFab';
import { TaskPanel } from '@/components/todo/TaskPanel';
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
  const [showCompleted, setShowCompleted] = useState(true);
  const [filterCat, setFilterCat] = useState<string>('all');

  // 週計畫：錨定週內任一天，往前/後翻週
  const [weekAnchor, setWeekAnchor] = useState(todayKey);
  // 聚焦的那一天（今日為主）——膠囊點選 / 拖曳改期都圍繞它
  const [focusDay, setFocusDay] = useState(todayKey);
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
  const parkTask = useAppStore((s) => s.parkTask);
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
        !t.parked &&
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

  // 逾期軌：過去未完成、非習慣、未置頂（緊急優先、日期最舊在前）。
  // 在「本週」鏡頭，落在目前顯示這一週的逾期改由看板呈現，避免重複與拖曳 id 衝突。
  const overdueTasks = useMemo(() => {
    const weekStart = localDateString(
      startOfWeek(parse(weekAnchor, 'yyyy-MM-dd', new Date()), { weekStartsOn: 1 }),
    );
    return catFiltered
      .filter(
        (t) =>
          t.completedAt === null &&
          !t.pinned &&
          t.source?.type !== 'habit' &&
          (t.parked ||
            (t.scheduledDate < todayKey && !(lens === 'week' && t.scheduledDate >= weekStart))),
      )
      .sort((a, b) => {
        const au = a.priority === 'high' ? 0 : 1;
        const bu = b.priority === 'high' ? 0 : 1;
        if (au !== bu) return au - bu;
        return a.scheduledDate.localeCompare(b.scheduledDate);
      });
  }, [catFiltered, todayKey, lens, weekAnchor]);

  // 週計畫：本週（週一起）7 天的 key，與各天的待辦（緊急優先＋手動排序）。
  const weekDates = useMemo(() => {
    const start = startOfWeek(parse(weekAnchor, 'yyyy-MM-dd', new Date()), {
      weekStartsOn: 1,
    });
    return Array.from({ length: 7 }, (_, i) => localDateString(addDays(start, i)));
  }, [weekAnchor]);

  // 顯示完整一週（含已過的日子），看得到整週狀況。
  const visibleWeekDates = weekDates;

  const weekTasksByDay = useMemo(() => {
    const set = new Set(visibleWeekDates);
    const map = new Map<string, typeof tasks>();
    for (const dk of visibleWeekDates) map.set(dk, []);
    for (const t of catFiltered) {
      if (t.completedAt !== null || t.pinned || t.parked) continue;
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

  // 本週各天「已完成」的待辦（劃線顯示，可用開關隱藏）。
  const completedByDay = useMemo(() => {
    const set = new Set(visibleWeekDates);
    const map = new Map<string, typeof tasks>();
    for (const dk of visibleWeekDates) map.set(dk, []);
    for (const t of catFiltered) {
      if (t.completedAt === null || t.source?.type === 'habit') continue;
      if (!set.has(t.scheduledDate)) continue;
      map.get(t.scheduledDate)!.push(t);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
    }
    return map;
  }, [catFiltered, visibleWeekDates]);

  const weekLabel = useMemo(() => {
    const s = parse(weekDates[0], 'yyyy-MM-dd', new Date());
    const e = parse(weekDates[6], 'yyyy-MM-dd', new Date());
    return `${format(s, 'M/d')} – ${format(e, 'M/d')}`;
  }, [weekDates]);

  const shiftWeek = (delta: number) => {
    const next = localDateString(
      addDays(parse(weekAnchor, 'yyyy-MM-dd', new Date()), delta * 7),
    );
    setWeekAnchor(next);
    const monday = startOfWeek(parse(next, 'yyyy-MM-dd', new Date()), { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => localDateString(addDays(monday, i)));
    // Land the focus on today if the new week contains it, else its Monday.
    setFocusDay(days.includes(todayKey) ? todayKey : days[0]);
  };

  const goToday = () => {
    setWeekAnchor(todayKey);
    setFocusDay(todayKey);
  };

  // 拖曳環境：週看板日欄 + 逾期積木共用（逾期可從整理區拖進某天）
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const weekDnd = useMemo(() => {
    const dayOfTask = new Map<string, string>();
    const idsByDay = new Map<string, string[]>();
    for (const dk of visibleWeekDates) {
      const list = weekTasksByDay.get(dk) ?? [];
      idsByDay.set(dk, list.map((t) => t.id));
      for (const t of list) dayOfTask.set(t.id, dk);
    }
    return { dayOfTask, idsByDay, overdueIds: new Set(overdueTasks.map((t) => t.id)) };
  }, [visibleWeekDates, weekTasksByDay, overdueTasks]);

  const activeDragTask =
    (activeDragId &&
      [...visibleWeekDates.flatMap((dk) => weekTasksByDay.get(dk) ?? []), ...overdueTasks].find(
        (t) => t.id === activeDragId,
      )) ||
    null;

  const handlePlanDragEnd = (e: DragEndEvent) => {
    setActiveDragId(null);
    setDragActive(false);
    const { active, over } = e;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;

    // 拖回暫放區 → 擱著（離開日期看板）
    if (overId === STAGING_ID) {
      parkTask(activeId);
      return;
    }

    // 拖到週膠囊 → 改排到那一天（append 到該天末端）
    if (overId.startsWith(CAP_PREFIX)) {
      const day = overId.slice(CAP_PREFIX.length);
      const targetIds = [...(weekDnd.idsByDay.get(day) ?? [])];
      if (!targetIds.includes(activeId)) targetIds.push(activeId);
      moveTaskToDay(activeId, day, targetIds);
      return;
    }

    const targetDay = overId.startsWith(DAY_PREFIX)
      ? overId.slice(DAY_PREFIX.length)
      : weekDnd.dayOfTask.get(overId);
    if (!targetDay) return;

    const insertIndex = (dayIds: string[]) =>
      overId.startsWith(DAY_PREFIX) ? dayIds.length : Math.max(0, dayIds.indexOf(overId));

    // 逾期積木 → 排進某天
    if (weekDnd.overdueIds.has(activeId)) {
      const targetIds = [...(weekDnd.idsByDay.get(targetDay) ?? [])];
      targetIds.splice(insertIndex(targetIds), 0, activeId);
      moveTaskToDay(activeId, targetDay, targetIds);
      return;
    }
    const sourceDay = weekDnd.dayOfTask.get(activeId);
    if (!sourceDay) return;
    if (sourceDay === targetDay) {
      const ids = weekDnd.idsByDay.get(targetDay) ?? [];
      const oldIndex = ids.indexOf(activeId);
      const newIndex = overId.startsWith(DAY_PREFIX) ? ids.length - 1 : ids.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      setTaskOrder(arrayMove(ids, oldIndex, newIndex));
      return;
    }
    const targetIds = [...(weekDnd.idsByDay.get(targetDay) ?? [])];
    targetIds.splice(insertIndex(targetIds), 0, activeId);
    moveTaskToDay(activeId, targetDay, targetIds);
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
    <DndContext
      sensors={dndSensors}
      collisionDetection={closestCorners}
      onDragStart={(e: DragStartEvent) => {
        setActiveDragId(e.active.id as string);
        setDragActive(true);
      }}
      onDragEnd={handlePlanDragEnd}
      onDragCancel={() => {
        setActiveDragId(null);
        setDragActive(false);
      }}
    >
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
          {/* 鏡頭切換（規劃為主） */}
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
          {/* 週膠囊：點選聚焦某天，拖曳任務到膠囊即改期 */}
          <WeekCapsules
            weekDates={visibleWeekDates}
            todayKey={todayKey}
            focusDay={focusDay}
            countFor={(dk) => weekTasksByDay.get(dk)?.length ?? 0}
            onFocus={setFocusDay}
            onPrevWeek={() => shiftWeek(-1)}
            onNextWeek={() => shiftWeek(1)}
            onToday={goToday}
            weekLabel={weekLabel}
          />

          {/* 已完成顯示切換（新增改用右下角浮動按鈕） */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowCompleted((v) => !v)}
              aria-pressed={showCompleted}
              className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              {showCompleted ? (
                <Eye className="h-3.5 w-3.5" />
              ) : (
                <EyeOff className="h-3.5 w-3.5" />
              )}
              已完成
            </button>
          </div>

          {/* 聚焦日清單（拖到上方膠囊可改天；拖到暫放區可擱著） */}
          <WeekGrid
            weekDates={[focusDay]}
            todayKey={todayKey}
            tasksByDay={weekTasksByDay}
            completedByDay={completedByDay}
            showCompleted={showCompleted}
            onDelete={handleDelete}
            onComplete={handleComplete}
            onUncomplete={handleUncomplete}
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
              這段期間沒有待安排的事。點右下角的 ＋ 加入今天或未來要做的事。
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

          {/* 暫放 / 逾期：拖到上方膠囊或聚焦日安排，也可擱著 */}
          <OverdueRail
            droppableId={STAGING_ID}
            draggable={lens === 'week'}
            forceOpen={dragActive && lens === 'week'}
            defaultOpen={false}
            tasks={overdueTasks}
            todayKey={todayKey}
            onComplete={handleComplete}
            onDelete={handleDelete}
            onMoveToToday={(id) => moveTaskToDay(id, todayKey, [])}
            onReschedule={(id, d) => moveTaskToDay(id, d, [])}
          />
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
        </>
      )}
      </div>

      {/* 右下角浮動新增：用完即收，不再常駐頁面上方 */}
      {mode === 'plan' && (
        <QuickAddFab
          scheduledDate={lens === 'week' ? focusDay : todayKey}
          dateLabel={lens === 'week' ? dateLabel(focusDay) : '今天'}
        />
      )}

      <DragOverlay>
        {activeDragTask ? (
          <div className="w-[300px] max-w-[85vw]">
            <TaskItem
              task={activeDragTask}
              onDelete={handleDelete}
              onComplete={handleComplete}
              compact
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
