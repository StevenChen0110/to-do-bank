import { useState } from 'react';
import { addDays, parse } from 'date-fns';
import { CalendarCheck, FolderKanban, Inbox, Tags } from 'lucide-react';
import type { Task, TaskPriority } from '@/types';
import { localDateString } from '@/lib/dates';
import { PRIORITY_ORDER, focusTask, priorityOf } from '@/lib/work';
import type { WorkTaskActions } from '@/components/work/WorkTaskItem';
import { useAppStore } from '@/store/useAppStore';
import { useReward } from '@/context/RewardContext';
import { WorkToday } from '@/components/work/WorkToday';
import { WorkInbox } from '@/components/work/WorkInbox';
import { WorkProjects } from '@/components/work/WorkProjects';
import { WorkCategories } from '@/components/work/WorkCategories';
import { WorkFocus } from '@/components/work/WorkFocus';
import { cn } from '@/lib/utils';

type WorkView = 'today' | 'inbox' | 'projects' | 'categories';

const VIEWS: { id: WorkView; label: string; icon: typeof CalendarCheck }[] = [
  { id: 'today', label: 'Today', icon: CalendarCheck },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'categories', label: 'Categories', icon: Tags },
];

/**
 * Work OS — an execution-focused experience layer over the EXISTING Task /
 * Project data. Deliberately shows no reward/NT$ (Phase 1 rule), so Work can
 * be validated independently of the gamification loop.
 */
export function WorkPage() {
  const todayKey = localDateString();
  const tasks = useAppStore((s) => s.tasks);
  const projects = useAppStore((s) => s.projects);
  const addPendingTask = useAppStore((s) => s.addPendingTask);
  const completeTask = useAppStore((s) => s.completeTask);
  const setTaskPriority = useAppStore((s) => s.setTaskPriority);
  const moveTaskToDay = useAppStore((s) => s.moveTaskToDay);
  const parkTask = useAppStore((s) => s.parkTask);
  const updateTask = useAppStore((s) => s.updateTask);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const { showToast } = useReward();

  const [view, setView] = useState<WorkView>('today');
  const [focusing, setFocusing] = useState(false);

  // Completion goes through the EXISTING store action — reward/transaction
  // behaviour is untouched; Work simply doesn't surface it.
  const handleComplete = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.completedAt !== null) return;
    completeTask(taskId);
    showToast('已完成', 'success', task.title);
  };

  const handleCyclePriority = (task: Task) => {
    const current = priorityOf(task);
    const next: TaskPriority =
      PRIORITY_ORDER[(PRIORITY_ORDER.indexOf(current) + 1) % PRIORITY_ORDER.length];
    setTaskPriority(task.id, next);
  };

  /** Capture: title only, parked so it lands in Inbox rather than today. */
  const handleAddToInbox = (title: string) => {
    const created = addPendingTask(title, 'work', todayKey);
    if (!created) return;
    parkTask(created.id);
    showToast('已加入 Inbox', 'success', title);
  };

  /** Quick-add from Today: schedule straight into today's flow. */
  const handleAddToday = (title: string) => {
    const created = addPendingTask(title, 'work', todayKey);
    if (!created) return;
    showToast('已新增工作', 'success', title);
  };

  /** Capture straight into a category module. */
  const handleAddInCategory = (title: string, categoryId: string) => {
    const created = addPendingTask(title, categoryId, todayKey);
    if (!created) return;
    showToast('已新增工作', 'success', title);
  };

  const handleMoveToToday = (taskId: string) => {
    moveTaskToDay(taskId, todayKey, []);
    showToast('已移到今天', 'success');
  };

  const tomorrowKey = localDateString(
    addDays(parse(todayKey, 'yyyy-MM-dd', new Date()), 1),
  );

  /** Organise actions shared by every Work list — all existing store actions. */
  const taskActions: WorkTaskActions = {
    todayKey,
    tomorrowKey,
    onSchedule: (taskId, dateKey) => moveTaskToDay(taskId, dateKey, []),
    onPark: (taskId) => parkTask(taskId),
    onRename: (taskId, title) => updateTask(taskId, { title }),
    onRecategorize: (taskId, categoryId) => updateTask(taskId, { category: categoryId }),
    onDelete: (taskId) => {
      deleteTask(taskId);
      showToast('已刪除', 'info');
    },
  };

  /** Defer = push to tomorrow, keeping it out of today's focus. */
  const handleDefer = (taskId: string) => {
    moveTaskToDay(taskId, tomorrowKey, []);
    showToast('已延到明天', 'info');
  };

  if (focusing) {
    return (
      <WorkFocus
        task={focusTask(tasks, todayKey)}
        projects={projects}
        onComplete={(id) => handleComplete(id)}
        onDefer={handleDefer}
        onExit={() => setFocusing(false)}
      />
    );
  }

  return (
    <div className="lg:flex lg:gap-6">
      {/* Desktop: left rail. Mobile: segmented row. */}
      <nav
        aria-label="工作導覽"
        className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 lg:mb-0 lg:w-40 lg:shrink-0 lg:flex-col lg:self-start lg:border-0 lg:bg-transparent lg:p-0"
      >
        {VIEWS.map(({ id, label, icon: Icon }) => {
          const selected = view === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              aria-current={selected ? 'page' : undefined}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors lg:flex-none lg:justify-start lg:px-3 lg:py-2',
                selected
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground lg:hover:bg-muted',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="min-w-0 flex-1">
        {view === 'today' && (
          <WorkToday
            tasks={tasks}
            projects={projects}
            todayKey={todayKey}
            onComplete={handleComplete}
            onCyclePriority={handleCyclePriority}
            onAdd={handleAddToday}
            actions={taskActions}
            onStartFocus={() => setFocusing(true)}
            onOpenProjects={() => setView('projects')}
          />
        )}
        {view === 'inbox' && (
          <WorkInbox
            tasks={tasks}
            projects={projects}
            onComplete={handleComplete}
            onCyclePriority={handleCyclePriority}
            onAdd={handleAddToInbox}
            onMoveToToday={handleMoveToToday}
            actions={taskActions}
          />
        )}
        {view === 'projects' && (
          <WorkProjects tasks={tasks} projects={projects} />
        )}
        {view === 'categories' && (
          <WorkCategories
            tasks={tasks}
            projects={projects}
            todayKey={todayKey}
            onComplete={handleComplete}
            onCyclePriority={handleCyclePriority}
            onAddInCategory={handleAddInCategory}
            actions={taskActions}
          />
        )}
      </div>
    </div>
  );
}
