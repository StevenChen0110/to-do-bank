import { Circle, CheckCircle2, Trash2 } from 'lucide-react';
import type { Task } from '@/types';
import { labelForCategory } from '@/lib/categories';
import { PRIORITY_META, nextPriority, taskPriority } from '@/lib/priority';
import { formatCurrency } from '@/lib/format';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TaskItemProps {
  task: Task;
  onDelete: (taskId: string) => void;
  onComplete?: (taskId: string) => void;
}

export function TaskItem({ task, onDelete, onComplete }: TaskItemProps) {
  const completed = task.completedAt !== null;
  const customCategories = useAppStore((s) => s.settings.customCategories);
  const habits = useAppStore((s) => s.habits);
  const projects = useAppStore((s) => s.projects);
  const setTaskPriority = useAppStore((s) => s.setTaskPriority);
  const catLabel = labelForCategory(task.category, customCategories);
  const pr = taskPriority(task.priority);

  let sourceLabel: string | null = null;
  if (task.source?.type === 'habit') {
    const h = habits.find((x) => x.id === task.source!.refId);
    sourceLabel = `🔁 ${h?.title ?? '習慣'}`;
  } else if (task.source?.type === 'project') {
    const p = projects.find((x) => x.id === task.source!.refId);
    sourceLabel = `📁 ${p?.title ?? '專案'}`;
  }

  return (
    <li className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-3">
      <button
        type="button"
        onClick={() => !completed && onComplete?.(task.id)}
        disabled={completed}
        aria-label={completed ? '已完成' : `完成 ${task.title}`}
        className="shrink-0 text-primary disabled:cursor-default"
      >
        {completed ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground transition-colors hover:text-primary" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-medium ${completed ? 'text-muted-foreground line-through' : ''}`}
        >
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {!completed && (
            <button
              type="button"
              onClick={() => setTaskPriority(task.id, nextPriority(task.priority))}
              aria-label={`優先級 ${PRIORITY_META[pr].label}，點擊調整`}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium transition-colors',
                PRIORITY_META[pr].chip,
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_META[pr].dot)} />
              {PRIORITY_META[pr].label}
            </button>
          )}
          <Badge variant="muted">{catLabel}</Badge>
          {sourceLabel && (
            <Badge variant="outline" className="border-primary/30 text-primary">
              {sourceLabel}
            </Badge>
          )}
          {completed ? (
            <span className="text-xs font-medium text-primary">
              +{formatCurrency(task.reward)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              +{formatCurrency(task.reward)} 待入帳
            </span>
          )}
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="min-h-10 shrink-0 text-muted-foreground"
        onClick={() => onDelete(task.id)}
        aria-label={`刪除 ${task.title}`}
      >
        <Trash2 className="h-4 w-4" />
        刪除
      </Button>
    </li>
  );
}
