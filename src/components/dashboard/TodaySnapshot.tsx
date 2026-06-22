import { CheckCircle2, Circle, ClipboardList, ListTodo } from 'lucide-react';
import type { Task } from '@/types';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

interface TodaySnapshotProps {
  tasks: Task[];
  dailyEarned: number;
  onComplete: (taskId: string) => void;
  onNavigate: () => void;
}

export function TodaySnapshot({ tasks, dailyEarned, onComplete, onNavigate }: TodaySnapshotProps) {
  const pending = tasks.filter((t) => t.completedAt === null);
  const completed = tasks.filter((t) => t.completedAt !== null);
  const total = tasks.length;
  const completedCount = completed.length;
  const progressPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <ListTodo className="h-4 w-4 text-primary" />
          今日待辦
        </h2>
        <div className="flex items-center gap-2">
          {total > 0 && (
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-primary">{completedCount}</span>
              {' / '}{total} 完成
            </span>
          )}
          <button
            type="button"
            onClick={onNavigate}
            className="flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary active:scale-95"
            aria-label="前往規劃今日待辦"
          >
            <ClipboardList className="h-3 w-3" />
            規劃
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mx-4 mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {/* Task list */}
      <div className="px-4">
        {total === 0 ? (
          <div className="flex flex-col items-center gap-3 pb-4 pt-1 text-center">
            <p className="text-sm text-muted-foreground">
              今天還沒有待辦。點「規劃」新增任務，打勾完成後自動入帳。
            </p>
            <button
              type="button"
              onClick={onNavigate}
              className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 active:scale-95"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              開始規劃今日待辦
            </button>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {/* Pending — tappable */}
            {pending.map((task) => (
              <li key={task.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onComplete(task.id)}
                  aria-label={`完成 ${task.title}`}
                  className="shrink-0 text-muted-foreground transition-colors hover:text-primary active:scale-90"
                >
                  <Circle className="h-4 w-4" />
                </button>
                <span className="flex-1 truncate text-sm">{task.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  +{formatCurrency(task.reward)}
                </span>
              </li>
            ))}

            {/* Divider between pending / completed */}
            {pending.length > 0 && completed.length > 0 && (
              <li aria-hidden className="border-t border-border pt-0.5" />
            )}

            {/* Completed */}
            {completed.map((task) => (
              <li key={task.id} className="flex items-center gap-2">
                <CheckCircle2 className={cn('h-4 w-4 shrink-0 text-primary')} />
                <span className="flex-1 truncate text-sm text-muted-foreground line-through">
                  {task.title}
                </span>
                <span className="shrink-0 text-xs font-medium text-primary">
                  +{formatCurrency(task.reward)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between border-t border-border px-4 py-3">
        <span className="text-xs text-muted-foreground">今日入帳</span>
        <span className="text-sm font-semibold text-primary">
          {formatCurrency(dailyEarned)}
        </span>
      </div>
    </section>
  );
}
