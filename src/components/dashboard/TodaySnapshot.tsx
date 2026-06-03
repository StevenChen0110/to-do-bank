import { CheckCircle2, ListTodo } from 'lucide-react';
import type { Task } from '@/types';
import { formatCurrency } from '@/lib/format';

interface TodaySnapshotProps {
  tasks: Task[];
  dailyEarned: number;
}

export function TodaySnapshot({ tasks, dailyEarned }: TodaySnapshotProps) {
  const completed = tasks.filter((t) => t.completedAt !== null);

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <ListTodo className="h-4 w-4 text-primary" />
        今日成就
      </h2>
      {completed.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          還沒有記錄。到「待辦回顧」輸入完成事項，按 Enter 入帳。
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {completed.slice(0, 5).map((task) => (
            <li
              key={task.id}
              className="flex items-start gap-2 text-sm"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="flex-1">{task.title}</span>
            </li>
          ))}
          {completed.length > 5 && (
            <li className="text-xs text-muted-foreground">
              另有 {completed.length - 5} 筆…
            </li>
          )}
        </ul>
      )}
      <p className="mt-4 border-t border-border pt-3 text-sm">
        今日入帳{' '}
        <span className="font-semibold text-primary">
          {formatCurrency(dailyEarned)}
        </span>
      </p>
    </section>
  );
}
