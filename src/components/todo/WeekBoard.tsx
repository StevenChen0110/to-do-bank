import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format, parse } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ChevronDown } from 'lucide-react';
import type { Task } from '@/types';
import { cn } from '@/lib/utils';
import { TaskItem } from './TaskItem';

/** Droppable id prefix for a day column. */
export const DAY_PREFIX = 'day:';

interface WeekGridProps {
  /** The visible yyyy-MM-dd keys (today → Sun) of the week. */
  weekDates: string[];
  todayKey: string;
  /** Pending tasks that fall within the week, keyed by day. */
  tasksByDay: Map<string, Task[]>;
  /** Completed tasks per day (shown struck-through when showCompleted). */
  completedByDay: Map<string, Task[]>;
  showCompleted: boolean;
  onDelete: (taskId: string) => void;
  onComplete: (taskId: string) => void;
  onUncomplete: (taskId: string) => void;
}

function SortableRow({
  task,
  onDelete,
  onComplete,
}: {
  task: Task;
  onDelete: (taskId: string) => void;
  onComplete: (taskId: string) => void;
}) {
  const { setNodeRef, transform, transition, attributes, listeners, isDragging } =
    useSortable({ id: task.id });
  return (
    <TaskItem
      task={task}
      onDelete={onDelete}
      onComplete={onComplete}
      compact
      drag={{
        setNodeRef,
        style: { transform: CSS.Transform.toString(transform), transition },
        attributes: attributes as unknown as Record<string, unknown>,
        listeners: (listeners ?? {}) as unknown as Record<string, unknown>,
        isDragging,
      }}
    />
  );
}

function DayColumn({
  dk,
  todayKey,
  tasks,
  completedTasks,
  completedCount,
  onDelete,
  onComplete,
  onUncomplete,
}: {
  dk: string;
  todayKey: string;
  tasks: Task[];
  completedTasks: Task[];
  /** Total completed for the day — shown even when the list is hidden. */
  completedCount: number;
  onDelete: (taskId: string) => void;
  onComplete: (taskId: string) => void;
  onUncomplete: (taskId: string) => void;
}) {
  const isToday = dk === todayKey;
  const isPast = dk < todayKey;
  // Past days collapse by default — unless they still hold unfinished tasks.
  const [open, setOpen] = useState(!isPast || tasks.length > 0);
  const { setNodeRef, isOver } = useDroppable({ id: `${DAY_PREFIX}${dk}` });
  const ids = tasks.map((t) => t.id);
  const d = parse(dk, 'yyyy-MM-dd', new Date());

  return (
    <section
      className={cn(
        'rounded-xl border bg-card p-3 transition-colors',
        isToday ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border',
        isOver && 'border-primary/60 bg-primary/5',
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn('mb-2 flex w-full items-center justify-between', !open && 'mb-0')}
      >
        <h3
          className={cn(
            'text-sm font-semibold',
            isToday && 'text-primary',
            isPast && 'text-muted-foreground',
          )}
        >
          {format(d, 'EEEE', { locale: zhTW })}
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
            {format(d, 'M/d')}
          </span>
          {isToday && <span className="ml-1.5 text-[10px] text-primary">今天</span>}
          {isPast && <span className="ml-1.5 text-[10px] text-amber-600">逾期</span>}
        </h3>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {tasks.length} 件
          {completedCount > 0 && (
            <span className="text-emerald-600">· 完成 {completedCount}</span>
          )}
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </span>
      </button>

      {open && (
        <>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <ul ref={setNodeRef} className="min-h-[2.5rem] space-y-2">
              {tasks.length === 0 && completedTasks.length === 0 && (
                <li className="rounded-lg border border-dashed border-border/60 px-3 py-3 text-center text-[11px] text-muted-foreground/70">
                  拖到這裡安排
                </li>
              )}
              {tasks.map((task) => (
                <SortableRow key={task.id} task={task} onDelete={onDelete} onComplete={onComplete} />
              ))}
            </ul>
          </SortableContext>

          {completedTasks.length > 0 && (
            <ul className="mt-2 space-y-2 border-t border-border/60 pt-2 opacity-55 transition-opacity hover:opacity-90">
              {completedTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  compact
                  onDelete={onDelete}
                  onComplete={onComplete}
                  onUncomplete={onUncomplete}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

/** The 7-day grid. Relies on a DndContext provided by the parent (so the
 *  overdue lane above can drop into these days). */
export function WeekGrid({
  weekDates,
  todayKey,
  tasksByDay,
  completedByDay,
  showCompleted,
  onDelete,
  onComplete,
  onUncomplete,
}: WeekGridProps) {
  return (
    <div className="flex flex-col gap-3">
      {weekDates.map((dk) => (
        <DayColumn
          key={dk}
          dk={dk}
          todayKey={todayKey}
          tasks={tasksByDay.get(dk) ?? []}
          completedTasks={showCompleted ? completedByDay.get(dk) ?? [] : []}
          completedCount={(completedByDay.get(dk) ?? []).length}
          onDelete={onDelete}
          onComplete={onComplete}
          onUncomplete={onUncomplete}
        />
      ))}
    </div>
  );
}
