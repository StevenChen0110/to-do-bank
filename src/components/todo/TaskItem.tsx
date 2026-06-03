import { motion } from 'framer-motion';
import { Undo2 } from 'lucide-react';
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
  index: number;
  onRevoke: (taskId: string) => void;
}

export function TaskItem({ task, index, onRevoke }: TaskItemProps) {
  const completed = task.completedAt !== null;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.25), duration: 0.25 }}
      className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-3"
    >
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
      {completed && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-10 shrink-0"
          onClick={() => onRevoke(task.id)}
          aria-label={`撤銷 ${task.title}`}
        >
          <Undo2 className="h-4 w-4" />
          撤銷
        </Button>
      )}
    </motion.li>
  );
}
