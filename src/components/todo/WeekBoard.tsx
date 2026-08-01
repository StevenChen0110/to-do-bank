import { useMemo, useState, type KeyboardEvent } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format, parse } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import type { Task } from '@/types';
import { cn } from '@/lib/utils';
import { TaskItem } from './TaskItem';

interface WeekBoardProps {
  /** The 7 yyyy-MM-dd keys of the week (Mon → Sun). */
  weekDates: string[];
  todayKey: string;
  /** Pending tasks that fall within the week, keyed by day. */
  tasksByDay: Map<string, Task[]>;
  onDelete: (taskId: string) => void;
  onComplete: (taskId: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onMoveToDay: (taskId: string, date: string, orderedIds: string[]) => void;
  onQuickAdd: (date: string, title: string) => void;
}

const DAY_PREFIX = 'day:';

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
  const isPast = dk < todayKey;
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
        <h3
          className={cn(
            'text-sm font-semibold',
            isToday && 'text-primary',
            isPast && !isToday && 'text-muted-foreground',
          )}
        >
          {format(d, 'EEEE', { locale: zhTW })}
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
            {format(d, 'M/d')}
          </span>
          {isToday && <span className="ml-1.5 text-[10px] text-primary">今天</span>}
        </h3>
        <span className="text-xs text-muted-foreground">{tasks.length} 件</span>
      </div>

      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="min-h-[2rem] space-y-2">
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

      {/* 每日快速新增（不用選日期） */}
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

export function WeekBoard({
  weekDates,
  todayKey,
  tasksByDay,
  onDelete,
  onComplete,
  onReorder,
  onMoveToDay,
  onQuickAdd,
}: WeekBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  const { dayOfTask, idsByDay } = useMemo(() => {
    const dayOfTask = new Map<string, string>();
    const idsByDay = new Map<string, string[]>();
    for (const dk of weekDates) {
      const list = tasksByDay.get(dk) ?? [];
      idsByDay.set(dk, list.map((t) => t.id));
      for (const t of list) dayOfTask.set(t.id, dk);
    }
    return { dayOfTask, idsByDay };
  }, [weekDates, tasksByDay]);

  const activeTask = activeId
    ? weekDates.flatMap((dk) => tasksByDay.get(dk) ?? []).find((t) => t.id === activeId) ?? null
    : null;

  function dayOfOver(overId: string): string | null {
    if (overId.startsWith(DAY_PREFIX)) return overId.slice(DAY_PREFIX.length);
    return dayOfTask.get(overId) ?? null;
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const activeTaskId = active.id as string;
    const overId = over.id as string;
    const sourceDay = dayOfTask.get(activeTaskId);
    const targetDay = dayOfOver(overId);
    if (!sourceDay || !targetDay) return;

    if (sourceDay === targetDay) {
      const ids = idsByDay.get(targetDay) ?? [];
      const oldIndex = ids.indexOf(activeTaskId);
      const newIndex = overId.startsWith(DAY_PREFIX) ? ids.length - 1 : ids.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      onReorder(arrayMove(ids, oldIndex, newIndex));
      return;
    }

    const targetIds = [...(idsByDay.get(targetDay) ?? [])];
    const insertAt = overId.startsWith(DAY_PREFIX)
      ? targetIds.length
      : Math.max(0, targetIds.indexOf(overId));
    targetIds.splice(insertAt, 0, activeTaskId);
    onMoveToDay(activeTaskId, targetDay, targetIds);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
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
      <DragOverlay>
        {activeTask ? (
          <TaskItem task={activeTask} onDelete={onDelete} onComplete={onComplete} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
