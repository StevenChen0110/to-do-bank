import { Pin } from 'lucide-react';
import type { Task } from '@/types';
import { Badge } from '@/components/ui/badge';
import { TaskItem } from './TaskItem';

interface TaskPanelProps {
  /** Pinned, still-pending tasks, pre-sorted (urgent first, then by date). */
  tasks: Task[];
  onComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onTogglePin: (taskId: string) => void;
  onToggleUrgent: (taskId: string) => void;
  /** Chip label for a task's scheduled day (e.g. 今日 / 明天 / 7/25). */
  dateLabel: (dateKey: string) => string;
}

/** Feishu-style "任務" panel — todos promoted to the top for quick focus. */
export function TaskPanel({
  tasks,
  onComplete,
  onDelete,
  onTogglePin,
  onToggleUrgent,
  dateLabel,
}: TaskPanelProps) {
  if (tasks.length === 0) return null;
  return (
    <section className="rounded-xl border border-primary/40 bg-primary/5 p-4">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-primary">
        <Pin className="h-4 w-4 fill-current" />
        任務
        <Badge variant="outline" className="border-primary/40 text-primary">
          {tasks.length}
        </Badge>
      </h3>
      <ul className="space-y-2">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onComplete={onComplete}
            onDelete={onDelete}
            onTogglePin={onTogglePin}
            onToggleUrgent={onToggleUrgent}
            dateBadge={dateLabel(task.scheduledDate)}
          />
        ))}
      </ul>
    </section>
  );
}
