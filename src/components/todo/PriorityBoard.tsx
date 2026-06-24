import { useEffect, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CheckCircle2, Circle, GripVertical, Trash2 } from 'lucide-react';
import type { Task, TaskPriority } from '@/types';
import { PRIORITY_META, PRIORITY_ORDER, taskPriority } from '@/lib/priority';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

type Bands = Record<TaskPriority, string[]>;

interface PriorityBoardProps {
  /** Pending (uncompleted) tasks only. */
  tasks: Task[];
  onComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onReorder: (updates: { id: string; priority: TaskPriority; order: number }[]) => void;
}

function buildBands(tasks: Task[]): Bands {
  const bands: Bands = { high: [], medium: [], low: [] };
  for (const p of PRIORITY_ORDER) {
    bands[p] = tasks
      .filter((t) => taskPriority(t.priority) === p)
      // no explicit order → float to top (newest behaviour); else by order
      .sort((a, b) => {
        const ao = a.order ?? -1;
        const bo = b.order ?? -1;
        if (ao !== bo) return ao - bo;
        return b.createdAt.localeCompare(a.createdAt);
      })
      .map((t) => t.id);
  }
  return bands;
}

export function PriorityBoard({ tasks, onComplete, onDelete, onReorder }: PriorityBoardProps) {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const [bands, setBands] = useState<Bands>(() => buildBands(tasks));
  const [activeId, setActiveId] = useState<string | null>(null);

  // Re-sync from persisted tasks (won't fire mid-drag since tasks only change on commit).
  useEffect(() => {
    setBands(buildBands(tasks));
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

  const findBand = (id: string): TaskPriority | null => {
    if (id in bands) return id as TaskPriority;
    return (PRIORITY_ORDER.find((p) => bands[p].includes(id)) ?? null) as TaskPriority | null;
  };

  const commit = (next: Bands) => {
    const updates: { id: string; priority: TaskPriority; order: number }[] = [];
    for (const p of PRIORITY_ORDER) {
      next[p].forEach((id, i) => updates.push({ id, priority: p, order: i }));
    }
    onReorder(updates);
  };

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    const from = findBand(activeId);
    const to = findBand(overId);
    if (!from || !to || from === to) return;
    setBands((prev) => {
      const fromItems = prev[from];
      const toItems = prev[to];
      const overIndex =
        overId in prev ? toItems.length : Math.max(toItems.indexOf(overId), 0);
      return {
        ...prev,
        [from]: fromItems.filter((id) => id !== activeId),
        [to]: [...toItems.slice(0, overIndex), activeId, ...toItems.slice(overIndex)],
      };
    });
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) {
      commit(bands);
      return;
    }
    const activeId = active.id as string;
    const overId = over.id as string;
    const from = findBand(activeId);
    const to = findBand(overId);
    if (!from || !to) {
      commit(bands);
      return;
    }
    let next = bands;
    if (from === to) {
      const arr = bands[from];
      const oldIndex = arr.indexOf(activeId);
      const newIndex = overId in bands ? arr.length - 1 : arr.indexOf(overId);
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        next = { ...bands, [from]: arrayMove(arr, oldIndex, newIndex) };
        setBands(next);
      }
    }
    commit(next);
  };

  const activeTask = activeId ? taskMap.get(activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-3">
        {PRIORITY_ORDER.map((p) => (
          <Band
            key={p}
            priority={p}
            itemIds={bands[p]}
            taskMap={taskMap}
            onComplete={onComplete}
            onDelete={onDelete}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? <RowContent task={activeTask} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}

interface BandProps {
  priority: TaskPriority;
  itemIds: string[];
  taskMap: Map<string, Task>;
  onComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

function Band({ priority, itemIds, taskMap, onComplete, onDelete }: BandProps) {
  const { setNodeRef } = useDroppable({ id: priority });
  const meta = PRIORITY_META[priority];

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className={cn('h-2.5 w-2.5 rounded-full', meta.dot)} />
        <h3 className="text-sm font-semibold">{meta.label}優先</h3>
        <span className="text-xs text-muted-foreground">{itemIds.length}</span>
      </div>
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="flex min-h-9 flex-col gap-1.5">
          {itemIds.length === 0 ? (
            <li className="rounded-lg border border-dashed border-border px-3 py-2 text-center text-xs text-muted-foreground">
              拖曳任務到這裡
            </li>
          ) : (
            itemIds.map((id) => {
              const task = taskMap.get(id);
              if (!task) return null;
              return (
                <SortableRow
                  key={id}
                  task={task}
                  onComplete={onComplete}
                  onDelete={onDelete}
                />
              );
            })
          )}
        </ul>
      </SortableContext>
    </section>
  );
}

interface RowProps {
  task: Task;
  onComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

function SortableRow({ task, onComplete, onDelete }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn('list-none', isDragging && 'opacity-40')}
    >
      <RowContent
        task={task}
        onComplete={onComplete}
        onDelete={onDelete}
        handleProps={{ ...attributes, ...listeners }}
      />
    </li>
  );
}

interface RowContentProps {
  task: Task;
  onComplete?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleProps?: any;
  dragging?: boolean;
}

function RowContent({ task, onComplete, onDelete, handleProps, dragging }: RowContentProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-2.5',
        dragging && 'shadow-lg ring-1 ring-primary/30',
      )}
    >
      <button
        type="button"
        className="shrink-0 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        aria-label="拖曳排序"
        {...handleProps}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onComplete?.(task.id)}
        aria-label={`完成 ${task.title}`}
        className="shrink-0 text-muted-foreground transition-colors hover:text-primary"
      >
        {task.completedAt ? (
          <CheckCircle2 className="h-5 w-5 text-primary" />
        ) : (
          <Circle className="h-5 w-5" />
        )}
      </button>
      <span className="min-w-0 flex-1 truncate text-sm">{task.title}</span>
      <span className="shrink-0 text-xs text-muted-foreground">
        +{formatCurrency(task.reward)}
      </span>
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          aria-label={`刪除 ${task.title}`}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
