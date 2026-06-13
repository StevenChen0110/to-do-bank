import { Circle, CheckCircle2, Trash2 } from 'lucide-react';
import type { Task } from '@/types';
import { labelForCategory } from '@/lib/categories';
import { formatCurrency } from '@/lib/format';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TaskItemProps {
  task: Task;
  onDelete: (taskId: string) => void;
  onComplete?: (taskId: string) => void;
}

export function TaskItem({ task, onDelete, onComplete }: TaskItemProps) {
  const completed = task.completedAt !== null;
  const customCategories = useAppStore((s) => s.settings.customCategories);
  const catLabel = labelForCategory(task.category, customCategories);

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
          <Badge variant="muted">{catLabel}</Badge>
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
