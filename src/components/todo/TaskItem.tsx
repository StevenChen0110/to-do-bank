import { Trash2 } from 'lucide-react';
import type { Task } from '@/types';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const CATEGORY_LABELS: Record<Task['category'], string> = {
  work: '工作',
  study: '學習',
  health: '運動',
  life: '生活',
  other: '其他',
};

interface TaskItemProps {
  task: Task;
  onDelete: (taskId: string) => void;
}

export function TaskItem({ task, onDelete }: TaskItemProps) {
  const completed = task.completedAt !== null;

  return (
    <li className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-3">
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-medium ${completed ? 'text-muted-foreground line-through' : ''}`}
        >
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant="muted">{CATEGORY_LABELS[task.category]}</Badge>
          {completed && (
            <span className="text-xs font-medium text-primary">
              +{formatCurrency(task.reward)}
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
