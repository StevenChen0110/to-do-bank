import { AlarmClock, Play } from 'lucide-react';
import type { Project, Task } from '@/types';
import { labelForCategory } from '@/lib/categories';
import {
  PRIORITY_LABEL,
  activeProjectSummaries,
  priorityOf,
  projectForTask,
  todayCounts,
  todayWorkTasks,
} from '@/lib/work';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { WorkTaskItem, type WorkTaskActions } from './WorkTaskItem';
import { WorkProjectCard } from './WorkProjectCard';
import { WorkQuickAdd } from './WorkQuickAdd';
import { WorkRoleSetup } from './WorkRoleSetup';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return '夜深了';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

interface WorkTodayProps {
  tasks: Task[];
  projects: Project[];
  todayKey: string;
  onComplete: (taskId: string) => void;
  onCyclePriority: (task: Task) => void;
  actions?: WorkTaskActions;
  onAdd: (title: string) => void;
  onStartFocus: () => void;
  onOpenProjects: () => void;
}

/** The Work homepage — answers「我現在最該做什麼？」in one screen. */
export function WorkToday({
  tasks,
  projects,
  todayKey,
  onComplete,
  onCyclePriority,
  actions,
  onAdd,
  onStartFocus,
  onOpenProjects,
}: WorkTodayProps) {
  const customCategories = useAppStore((s) => s.settings.customCategories);
  const workRole = useAppStore((s) => s.settings.workRole);
  const list = todayWorkTasks(tasks, todayKey);
  const counts = todayCounts(tasks, todayKey);
  const focus = list[0] ?? null;
  const rest = list.slice(1);
  // Overdue is triage, not today's plan — call it out instead of burying it.
  const overdue = rest.filter((t) => t.scheduledDate < todayKey);
  const onPlan = rest.filter((t) => t.scheduledDate >= todayKey);
  const summaries = activeProjectSummaries(projects, tasks).slice(0, 4);
  const focusProject = focus ? projectForTask(focus, projects) : null;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-lg font-semibold">{greeting()}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {counts.total === 0
            ? '今天沒有安排工作。'
            : `今天有 ${counts.total} 個工作`}
          {counts.important > 0 && ` · ${counts.important} 個重要`}
          {counts.overdue > 0 && ` · ${counts.overdue} 個逾期`}
        </p>
      </header>

      {!workRole && (
        <section className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <WorkRoleSetup />
        </section>
      )}

      {focus && (
        <section>
          <h2 className="mb-2 text-[11px] font-semibold tracking-[0.15em] text-muted-foreground">
            TODAY&apos;S FOCUS
          </h2>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="text-base font-medium leading-snug">{focus.title}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span className="rounded bg-background px-1.5 py-0.5 font-semibold text-foreground">
                {PRIORITY_LABEL[priorityOf(focus)]}
              </span>
              <span>{labelForCategory(focus.category, customCategories)}</span>
              {focusProject && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span>{focusProject.title}</span>
                </>
              )}
            </div>
            <Button type="button" className="mt-3 min-h-10 w-full sm:w-auto" onClick={onStartFocus}>
              <Play className="h-4 w-4" />
              開始專注
            </Button>
          </div>
        </section>
      )}

      {overdue.length > 0 && (
        <section>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="flex items-center gap-1 text-[11px] font-semibold tracking-[0.15em] text-amber-700">
              <AlarmClock className="h-3 w-3" />
              逾期 {overdue.length}
            </h2>
            {actions && (
              <button
                type="button"
                onClick={() => overdue.forEach((t) => actions.onSchedule(t.id, todayKey))}
                className="text-[11px] text-muted-foreground transition-colors hover:text-primary"
              >
                全部移到今天
              </button>
            )}
          </div>
          <div className="rounded-xl border border-amber-500/40 bg-amber-50/30 dark:bg-amber-950/10">
            <ul className="divide-y divide-border/60 p-1">
              {overdue.map((task) => (
                <WorkTaskItem
                  key={task.id}
                  task={task}
                  projects={projects}
                  onComplete={onComplete}
                  onCyclePriority={onCyclePriority}
                  actions={actions}
                />
              ))}
            </ul>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-1 text-[11px] font-semibold tracking-[0.15em] text-muted-foreground">
          TODAY
        </h2>
        <div className="rounded-xl border border-border bg-card">
          {onPlan.length === 0 && !focus ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              今天還沒有工作。在下方輸入即可新增。
            </p>
          ) : (
            <ul className="divide-y divide-border/60 p-1">
              {onPlan.map((task) => (
                <WorkTaskItem
                  key={task.id}
                  task={task}
                  projects={projects}
                  onComplete={onComplete}
                  onCyclePriority={onCyclePriority}
                  actions={actions}
                />
              ))}
            </ul>
          )}
          <div className="border-t border-border/60 px-3">
            <WorkQuickAdd onAdd={onAdd} placeholder="新增今天的工作…" />
          </div>
        </div>
      </section>

      {summaries.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold tracking-[0.15em] text-muted-foreground">
              ACTIVE PROJECTS
            </h2>
            <button
              type="button"
              onClick={onOpenProjects}
              className="text-[11px] text-muted-foreground transition-colors hover:text-primary"
            >
              全部 →
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {summaries.map((s) => (
              <WorkProjectCard key={s.project.id} summary={s} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
