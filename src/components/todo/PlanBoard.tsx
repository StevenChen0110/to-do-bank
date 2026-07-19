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
import { useMemo, useState } from 'react';
import type { Task } from '@/types';
import { cn } from '@/lib/utils';
import { TaskItem } from './TaskItem';

interface PlanBoardProps {
  /** [dateKey, tasks] pre-sorted by day and within-day order. */
  groups: [string, Task[]][];
  todayKey: string;
  dateLabel: (dk: string) => string;
  onDelete: (taskId: string) => void;
  onComplete: (taskId: string) => void;
  /** Same-day reorder: full new order of that day's ids. */
  onReorder: (orderedIds: string[]) => void;
  /** Cross-day move: task + target date + new order of the target day's ids. */
  onMoveToDay: (taskId: string, date: string, orderedIds: string[]) => void;
  onToggleUrgent: (taskId: string) => void;
  onTogglePin: (taskId: string) => void;
}

const DAY_PREFIX = 'day:';

function SortableRow({
  task,
  onDelete,
  onComplete,
  onToggleUrgent,
  onTogglePin,
}: {
  task: Task;
  onDelete: (taskId: string) => void;
  onComplete: (taskId: string) => void;
  onToggleUrgent: (taskId: string) => void;
  onTogglePin: (taskId: string) => void;
}) {
  const { setNodeRef, transform, transition, attributes, listeners, isDragging } =
    useSortable({ id: task.id });
  return (
    <TaskItem
      task={task}
      onDelete={onDelete}
      onComplete={onComplete}
      onToggleUrgent={onToggleUrgent}
      onTogglePin={onTogglePin}
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
  label,
  tasks,
  onDelete,
  onComplete,
  onToggleUrgent,
  onTogglePin,
}: {
  dk: string;
  todayKey: string;
  label: string;
  tasks: Task[];
  onDelete: (taskId: string) => void;
  onComplete: (taskId: string) => void;
  onToggleUrgent: (taskId: string) => void;
  onTogglePin: (taskId: string) => void;
}) {
  const overdue = dk < todayKey;
  const { setNodeRef, isOver } = useDroppable({ id: `${DAY_PREFIX}${dk}` });
  const ids = tasks.map((t) => t.id);
  return (
    <section
      className={cn(
        'rounded-xl border border-border bg-card p-4 transition-colors',
        isOver && 'border-primary/50 bg-primary/5',
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className={cn('text-sm font-semibold', overdue && 'text-amber-600')}>
          {overdue && '逾期 · '}
          {label}
        </h3>
        <span className="text-xs text-muted-foreground">
          {tasks.length} 件 · 可拖曳排序/跨日
        </span>
      </div>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="min-h-[2.5rem] space-y-2">
          {tasks.map((task) => (
            <SortableRow
              key={task.id}
              task={task}
              onDelete={onDelete}
              onComplete={onComplete}
              onToggleUrgent={onToggleUrgent}
              onTogglePin={onTogglePin}
            />
          ))}
        </ul>
      </SortableContext>
    </section>
  );
}

export function PlanBoard({
  groups,
  todayKey,
  dateLabel,
  onDelete,
  onComplete,
  onReorder,
  onMoveToDay,
  onToggleUrgent,
  onTogglePin,
}: PlanBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  // Lookups: task id -> day key, and day key -> ordered id list.
  const { dayOfTask, idsByDay } = useMemo(() => {
    const dayOfTask = new Map<string, string>();
    const idsByDay = new Map<string, string[]>();
    for (const [dk, tasks] of groups) {
      idsByDay.set(dk, tasks.map((t) => t.id));
      for (const t of tasks) dayOfTask.set(t.id, dk);
    }
    return { dayOfTask, idsByDay };
  }, [groups]);

  const activeTask = activeId
    ? groups.flatMap(([, list]) => list).find((t) => t.id === activeId) ?? null
    : null;

  function dayOfOver(overId: string): string | null {
    if (overId.startsWith(DAY_PREFIX)) return overId.slice(DAY_PREFIX.length);
    return dayOfTask.get(overId) ?? null;
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string);
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
      const newIndex = overId.startsWith(DAY_PREFIX)
        ? ids.length - 1
        : ids.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      onReorder(arrayMove(ids, oldIndex, newIndex));
      return;
    }

    // Cross-day: insert into the target day at the drop position.
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
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex flex-col gap-3">
        {groups.map(([dk, list]) => (
          <DayColumn
            key={dk}
            dk={dk}
            todayKey={todayKey}
            label={dateLabel(dk)}
            tasks={list}
            onDelete={onDelete}
            onComplete={onComplete}
            onToggleUrgent={onToggleUrgent}
            onTogglePin={onTogglePin}
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
