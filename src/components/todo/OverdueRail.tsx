import { useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { format, parse } from 'date-fns';
import {
  CalendarClock,
  ChevronDown,
  Circle,
  GripVertical,
  Inbox,
  Sun,
  Trash2,
} from 'lucide-react';
import type { Task } from '@/types';
import { labelForCategory } from '@/lib/categories';
import { useAppStore } from '@/store/useAppStore';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/** Droppable id for the staging ("暫放") area. */
export const STAGING_ID = 'staging';

interface OverdueRailProps {
  /** Overdue + parked tasks shown in the staging area. */
  tasks: Task[];
  todayKey: string;
  onComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onMoveToToday: (taskId: string) => void;
  onReschedule: (taskId: string, date: string) => void;
  /** Render bare (no outer card) — for nesting inside the 安排 block. */
  embedded?: boolean;
  /** When true, rows carry a drag handle (drag onto a day, or back here). */
  draggable?: boolean;
  /** Whether the item list starts expanded. */
  defaultOpen?: boolean;
  /** Force the list open (e.g. while dragging, so it's a visible drop target). */
  forceOpen?: boolean;
  /** Droppable id — makes the zone accept drops (park a task here). */
  droppableId?: string;
}

function StagingRow({
  task,
  todayKey,
  draggable,
  onComplete,
  onDelete,
  onMoveToToday,
  onReschedule,
}: {
  task: Task;
  todayKey: string;
  draggable: boolean;
  onComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onMoveToToday: (taskId: string) => void;
  onReschedule: (taskId: string, date: string) => void;
}) {
  const customCategories = useAppStore((s) => s.settings.customCategories);
  const { setNodeRef, transform, attributes, listeners, isDragging } = useDraggable({
    id: task.id,
    disabled: !draggable,
  });
  const d = parse(task.scheduledDate, 'yyyy-MM-dd', new Date());
  const overdue = task.scheduledDate < todayKey;

  return (
    <li
      ref={draggable ? setNodeRef : undefined}
      style={draggable ? { transform: CSS.Translate.toString(transform) } : undefined}
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2',
        isDragging && 'opacity-40',
      )}
    >
      {draggable && (
        <span
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab touch-none text-muted-foreground/50 active:cursor-grabbing"
          aria-label={`拖曳 ${task.title}`}
          title="拖到某天安排，或放回暫放區"
        >
          <GripVertical className="h-4 w-4" />
        </span>
      )}
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
          {overdue ? (
            <Badge variant="outline" className="border-amber-500/50 text-amber-600">
              {format(d, 'M/d')} 逾期
            </Badge>
          ) : (
            <Badge variant="outline" className="border-primary/30 text-primary">
              暫放
            </Badge>
          )}
          <Badge variant="muted">{labelForCategory(task.category, customCategories)}</Badge>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onMoveToToday(task.id)}
        className="flex shrink-0 items-center gap-1 rounded-md border border-primary/40 bg-primary/5 px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
        aria-label={`移到今天 ${task.title}`}
      >
        <Sun className="h-3.5 w-3.5" />
        今天
      </button>

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
}

/** Staging / overdue lane — a parking area you can drag tasks in and out of. */
export function OverdueRail({
  tasks,
  todayKey,
  onComplete,
  onDelete,
  onMoveToToday,
  onReschedule,
  embedded = false,
  draggable = false,
  defaultOpen = true,
  forceOpen = false,
  droppableId,
}: OverdueRailProps) {
  const [open, setOpen] = useState(defaultOpen);
  const { setNodeRef, isOver } = useDroppable({ id: droppableId ?? '__staging_noop__' });
  const isDrop = Boolean(droppableId);
  const listOpen = open || forceOpen;

  // Without a drop zone, an empty rail renders nothing.
  if (!isDrop && tasks.length === 0) return null;

  return (
    <section className={cn(!embedded && 'rounded-xl border border-amber-500/40 bg-amber-50/40')}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={listOpen}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-amber-700"
      >
        <Inbox className="h-4 w-4" />
        暫放
        <Badge variant="outline" className="border-amber-500/50 text-amber-600">
          {tasks.length}
        </Badge>
        <span className="ml-auto flex items-center gap-1 text-xs font-normal text-muted-foreground">
          {draggable ? '拖進日子／放回這裡' : '改期或完成'}
          <ChevronDown className={cn('h-4 w-4 transition-transform', listOpen && 'rotate-180')} />
        </span>
      </button>

      {listOpen && (
        <ul
          ref={isDrop ? setNodeRef : undefined}
          className={cn(
            'space-y-2 px-4 pb-4',
            isDrop && 'min-h-[2.5rem] rounded-lg',
            isOver && 'bg-amber-100/60 ring-1 ring-amber-400/50',
          )}
        >
          {tasks.length === 0 ? (
            <li className="rounded-lg border border-dashed border-amber-400/50 px-3 py-3 text-center text-[11px] text-muted-foreground">
              把待辦拖到這裡暫放
            </li>
          ) : (
            tasks.map((task) => (
              <StagingRow
                key={task.id}
                task={task}
                todayKey={todayKey}
                draggable={draggable}
                onComplete={onComplete}
                onDelete={onDelete}
                onMoveToToday={onMoveToToday}
                onReschedule={onReschedule}
              />
            ))
          )}
        </ul>
      )}
    </section>
  );
}
