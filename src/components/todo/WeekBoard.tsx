import { useState, type KeyboardEvent } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format, parse } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Plus } from 'lucide-react';
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
  onDelete: (taskId: string) => void;
  onComplete: (taskId: string) => void;
  onQuickAdd: (date: string, title: string) => void;
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
  onDelete,
  onComplete,
  onQuickAdd,
}: {
  dk: string;
  todayKey: string;
  tasks: Task[];
  onDelete: (taskId: string) => void;
  onComplete: (taskId: string) => void;
  onQuickAdd: (date: string, title: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const isToday = dk === todayKey;
  const { setNodeRef, isOver } = useDroppable({ id: `${DAY_PREFIX}${dk}` });
  const ids = tasks.map((t) => t.id);
  const d = parse(dk, 'yyyy-MM-dd', new Date());

  const submit = () => {
    const t = draft.trim();
    if (!t) return;
    onQuickAdd(dk, t);
    setDraft('');
  };

  return (
    <section
      className={cn(
        'rounded-xl border bg-card p-3 transition-colors',
        isToday ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border',
        isOver && 'border-primary/60 bg-primary/5',
      )}
    >
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className={cn('text-sm font-semibold', isToday && 'text-primary')}>
          {format(d, 'EEEE', { locale: zhTW })}
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
            {format(d, 'M/d')}
          </span>
          {isToday && <span className="ml-1.5 text-[10px] text-primary">今天</span>}
        </h3>
        <span className="text-xs text-muted-foreground">{tasks.length} 件</span>
      </div>

      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="min-h-[2.5rem] space-y-2">
          {tasks.length === 0 && (
            <li className="rounded-lg border border-dashed border-border/60 px-3 py-2 text-center text-[11px] text-muted-foreground/70">
              拖到這裡，或在下方快速新增
            </li>
          )}
          {tasks.map((task) => (
            <SortableRow key={task.id} task={task} onDelete={onDelete} onComplete={onComplete} />
          ))}
        </ul>
      </SortableContext>

      <div className="mt-2 flex items-center gap-1.5">
        <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="加一件事"
          maxLength={200}
          aria-label={`在 ${format(d, 'M/d')} 新增待辦`}
          className="min-h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        />
      </div>
    </section>
  );
}

/** The 7-day grid. Relies on a DndContext provided by the parent (so the
 *  overdue lane above can drop into these days). */
export function WeekGrid({
  weekDates,
  todayKey,
  tasksByDay,
  onDelete,
  onComplete,
  onQuickAdd,
}: WeekGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {weekDates.map((dk) => (
        <DayColumn
          key={dk}
          dk={dk}
          todayKey={todayKey}
          tasks={tasksByDay.get(dk) ?? []}
          onDelete={onDelete}
          onComplete={onComplete}
          onQuickAdd={onQuickAdd}
        />
      ))}
    </div>
  );
}
