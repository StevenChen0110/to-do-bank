import { CheckCircle2, Circle, ListTodo } from 'lucide-react';
import type { Task } from '@/types';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

interface TodaySnapshotProps {
  tasks: Task[];
  dailyEarned: number;
}

export function TodaySnapshot({ tasks, dailyEarned }: TodaySnapshotProps) {
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
          今日代辦
        </h2>
        {total > 0 && (
          <span className="text-xs text-muted-foreground">
            <span className="font-semibold text-primary">{completedCount}</span>
            {' / '}{total} 完成
          </span>
        )}
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
          <p className="pb-4 text-sm text-muted-foreground">
            還沒有代辦。到「存款明細」新增事項，打勾完成後自動入帳。
          </p>
        ) : (
          <ul className="space-y-2">
            {/* Pending first */}
            {pending.map((task) => (
              <li key={task.id} className="flex items-start gap-2 text-sm">
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-foreground">{task.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  +{formatCurrency(task.reward)}
                </span>
              </li>
            ))}
            {/* Completed below with divider */}
            {completed.length > 0 && pending.length > 0 && (
              <li aria-hidden className="border-t border-border pt-1" />
            )}
            {completed.map((task) => (
              <li
                key={task.id}
                className={cn('flex items-start gap-2 text-sm', completed.length > 0 && pending.length === 0 ? '' : '')}
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="flex-1 text-muted-foreground line-through">
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
