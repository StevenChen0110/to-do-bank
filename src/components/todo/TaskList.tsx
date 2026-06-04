import type { Task } from '@/types';
import { TaskItem } from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  onDelete: (taskId: string) => void;
  emptyMessage?: string;
}

export function TaskList({
  tasks,
  onDelete,
  emptyMessage = '今日尚無記錄。在上方輸入完成事項開始累積吧。',
}: TaskListProps) {
  const sorted = [...tasks].sort((a, b) => {
    const aDone = a.completedAt ? 1 : 0;
    const bDone = b.completedAt ? 1 : 0;
    if (aDone !== bDone) {
      return bDone - aDone;
    }
    return (b.completedAt ?? b.createdAt).localeCompare(
      a.completedAt ?? a.createdAt,
    );
  });

  if (sorted.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {sorted.map((task) => (
        <TaskItem key={task.id} task={task} onDelete={onDelete} />
      ))}
    </ul>
  );
}
