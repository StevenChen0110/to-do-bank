import { useState, type KeyboardEvent } from 'react';
import { CalendarDays, Circle, Inbox, Trash2 } from 'lucide-react';
import type { Project, Task, TaskPriority } from '@/types';
import { allCategories, labelForCategory } from '@/lib/categories';
import { PRIORITY_LABEL, priorityOf, projectForTask } from '@/lib/work';
import { useAppStore } from '@/store/useAppStore';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  high: 'text-rose-600 bg-rose-500/10',
  medium: 'text-amber-600 bg-amber-500/10',
  low: 'text-muted-foreground bg-muted',
};

export interface WorkTaskActions {
  /** Reschedule to a yyyy-MM-dd key. */
  onSchedule: (taskId: string, dateKey: string) => void;
  /** Park into Inbox (off the day board). */
  onPark: (taskId: string) => void;
  onRename: (taskId: string, title: string) => void;
  onRecategorize: (taskId: string, categoryId: string) => void;
  onDelete: (taskId: string) => void;
  /** yyyy-MM-dd for today / tomorrow chips. */
  todayKey: string;
  tomorrowKey: string;
}

interface WorkTaskItemProps {
  task: Task;
  projects: Project[];
  onComplete: (taskId: string) => void;
  onCyclePriority: (task: Task) => void;
  /** Shown when the task is scheduled before today. */
  overdueLabel?: string;
  /** Enables the inline organise panel (edit / reschedule / re-file / delete). */
  actions?: WorkTaskActions;
}

/**
 * Execution-oriented task row. Deliberately shows NO reward/NT$ — Work is
 * validated independently of the gamification layer (Phase 1 rule).
 * Tapping the title opens an inline panel so work can be organised without
 * navigating away or filling a form.
 */
export function WorkTaskItem({
  task,
  projects,
  onComplete,
  onCyclePriority,
  overdueLabel,
  actions,
}: WorkTaskItemProps) {
  const customCategories = useAppStore((s) => s.settings.customCategories);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const priority = priorityOf(task);
  const project = projectForTask(task, projects);

  const commitRename = () => {
    const t = draft.trim();
    if (!t || t === task.title) {
      setDraft(task.title);
      return;
    }
    actions?.onRename(task.id, t);
  };

  return (
    <li className="rounded-lg transition-colors hover:bg-muted/50">
      <div className="flex items-start gap-2.5 px-2 py-2">
        <button
          type="button"
          onClick={() => onComplete(task.id)}
          aria-label={`完成 ${task.title}`}
          className="mt-0.5 shrink-0 text-muted-foreground/60 transition-colors hover:text-primary active:scale-90"
        >
          <Circle className="h-[18px] w-[18px]" />
        </button>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => actions && setOpen((v) => !v)}
            aria-expanded={actions ? open : undefined}
            className={cn('block w-full text-left text-sm leading-snug', !actions && 'cursor-default')}
          >
            {task.title}
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            <button
              type="button"
              onClick={() => onCyclePriority(task)}
              aria-label="切換優先順序"
              className={cn(
                'rounded px-1.5 py-0.5 font-semibold transition-opacity hover:opacity-80',
                PRIORITY_STYLE[priority],
              )}
            >
              {PRIORITY_LABEL[priority]}
            </button>
            <span>{labelForCategory(task.category, customCategories)}</span>
            {project && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="truncate">{project.title}</span>
              </>
            )}
            {overdueLabel && (
              <span className="font-medium text-amber-600">{overdueLabel}</span>
            )}
          </div>
        </div>
      </div>

      {actions && open && (
        <div className="border-t border-border/60 px-2 pb-2.5 pt-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                commitRename();
                setOpen(false);
              } else if (e.key === 'Escape') {
                setDraft(task.title);
                setOpen(false);
              }
            }}
            onBlur={commitRename}
            maxLength={200}
            aria-label="編輯工作名稱"
            className="h-9 text-sm"
          />

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-medium text-muted-foreground">排程</span>
            <Chip
              active={!task.parked && task.scheduledDate === actions.todayKey}
              onClick={() => actions.onSchedule(task.id, actions.todayKey)}
            >
              <CalendarDays className="mr-0.5 inline h-3 w-3" />
              今天
            </Chip>
            <Chip
              active={!task.parked && task.scheduledDate === actions.tomorrowKey}
              onClick={() => actions.onSchedule(task.id, actions.tomorrowKey)}
            >
              明天
            </Chip>
            <Chip active={!!task.parked} onClick={() => actions.onPark(task.id)}>
              <Inbox className="mr-0.5 inline h-3 w-3" />
              Inbox
            </Chip>
            <button
              type="button"
              onClick={() => actions.onDelete(task.id)}
              aria-label="刪除工作"
              className="ml-auto rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-medium text-muted-foreground">分類</span>
            {allCategories(customCategories).map((c) => (
              <Chip
                key={c.id}
                active={task.category === c.id}
                onClick={() => actions.onRecategorize(task.id, c.id)}
              >
                {c.label}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </li>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-card text-muted-foreground hover:border-primary/40',
      )}
    >
      {children}
    </button>
  );
}
