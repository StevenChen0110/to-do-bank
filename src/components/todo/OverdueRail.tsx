import { useState } from 'react';
import { format, parse } from 'date-fns';
import { AlertTriangle, CalendarClock, ChevronDown, Circle, Sun, Trash2 } from 'lucide-react';
import type { Task } from '@/types';
import { labelForCategory } from '@/lib/categories';
import { useAppStore } from '@/store/useAppStore';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface OverdueRailProps {
  /** Pending, non-habit tasks whose scheduledDate is before today. */
  tasks: Task[];
  todayKey: string;
  onComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onMoveToToday: (taskId: string) => void;
  onReschedule: (taskId: string, date: string) => void;
}

/** Always-on overdue lane — the "migration" surface: decide, reschedule, or drop. */
export function OverdueRail({
  tasks,
  todayKey,
  onComplete,
  onDelete,
  onMoveToToday,
  onReschedule,
}: OverdueRailProps) {
  const [open, setOpen] = useState(true);
  const customCategories = useAppStore((s) => s.settings.customCategories);
  if (tasks.length === 0) return null;

  return (
    <section className="rounded-xl border border-amber-500/40 bg-amber-50/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-amber-700"
      >
        <AlertTriangle className="h-4 w-4" />
        逾期
        <Badge variant="outline" className="border-amber-500/50 text-amber-600">
          {tasks.length}
        </Badge>
        <span className="ml-auto flex items-center gap-1 text-xs font-normal text-muted-foreground">
          改期或完成
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </span>
      </button>

      {open && (
        <ul className="space-y-2 px-4 pb-4">
          {tasks.map((task) => {
            const d = parse(task.scheduledDate, 'yyyy-MM-dd', new Date());
            return (
              <li
                key={task.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => onComplete(task.id)}
                  aria-label={`完成 ${task.title}`}
                  className="shrink-0 text-muted-foreground transition-colors hover:text-primary active:scale-90"
                >
                  <Circle className="h-5 w-5" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{task.title}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="border-amber-500/50 text-amber-600">
                      {format(d, 'M/d')} 逾期
                    </Badge>
                    <Badge variant="muted">
                      {labelForCategory(task.category, customCategories)}
                    </Badge>
                  </div>
                </div>

                {/* 移到今天 */}
                <button
                  type="button"
                  onClick={() => onMoveToToday(task.id)}
                  className="flex shrink-0 items-center gap-1 rounded-md border border-primary/40 bg-primary/5 px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
                  aria-label={`移到今天 ${task.title}`}
                >
                  <Sun className="h-3.5 w-3.5" />
                  今天
                </button>

                {/* 改到某天 */}
                <label
                  className="relative flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  title="改到某天"
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  改期
                  <input
                    type="date"
                    value=""
                    min={todayKey}
                    onChange={(e) => e.target.value && onReschedule(task.id, e.target.value)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    aria-label={`改期 ${task.title}`}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => onDelete(task.id)}
                  aria-label={`刪除 ${task.title}`}
                  className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
