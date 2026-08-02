import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import {
  Check,
  CheckCircle2,
  Circle,
  Flag,
  GripVertical,
  Pencil,
  Pin,
  Trash2,
  X,
} from 'lucide-react';
import type { Task } from '@/types';
import { allCategories, labelForCategory } from '@/lib/categories';
import { formatCurrency } from '@/lib/format';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface DragProps {
  setNodeRef: (el: HTMLElement | null) => void;
  style?: CSSProperties;
  attributes?: Record<string, unknown>;
  listeners?: Record<string, unknown>;
  isDragging?: boolean;
}

interface TaskItemProps {
  task: Task;
  onDelete: (taskId: string) => void;
  onComplete?: (taskId: string) => void;
  /** Revert a completed task back to pending. Enables toggle on the checkbox. */
  onUncomplete?: (taskId: string) => void;
  /** Toggle the urgent flag. When provided, a flag button is shown. */
  onToggleUrgent?: (taskId: string) => void;
  /** Toggle pin-to-任務. When provided, a pin button is shown. */
  onTogglePin?: (taskId: string) => void;
  /** Small date chip (used by the 任務 panel to show the scheduled day). */
  dateBadge?: string;
  /** Tighter layout for narrow columns (week board): icon-only actions. */
  compact?: boolean;
  /** When provided, renders a drag handle and makes the row sortable. */
  drag?: DragProps;
}

export function TaskItem({
  task,
  onDelete,
  onComplete,
  onUncomplete,
  onToggleUrgent,
  onTogglePin,
  dateBadge,
  compact = false,
  drag,
}: TaskItemProps) {
  const completed = task.completedAt !== null;
  const urgent = task.priority === 'high';
  const customCategories = useAppStore((s) => s.settings.customCategories);
  const habits = useAppStore((s) => s.habits);
  const projects = useAppStore((s) => s.projects);
  const updateTask = useAppStore((s) => s.updateTask);
  const catLabel = labelForCategory(task.category, customCategories);

  // Inline editing (manual tasks only — habit/project titles come from source).
  const editable = !task.source;
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editCat, setEditCat] = useState(task.category);

  const startEdit = () => {
    setEditTitle(task.title);
    setEditCat(task.category);
    setEditing(true);
  };
  const saveEdit = () => {
    if (!editTitle.trim()) return;
    updateTask(task.id, { title: editTitle, category: editCat });
    setEditing(false);
  };

  let sourceLabel: string | null = null;
  if (task.source?.type === 'habit') {
    const h = habits.find((x) => x.id === task.source!.refId);
    sourceLabel = `🔁 ${h?.title ?? '習慣'}`;
  } else if (task.source?.type === 'project') {
    const p = projects.find((x) => x.id === task.source!.refId);
    sourceLabel = `📁 ${p?.title ?? '專案'}`;
  }

  if (editing) {
    const cats = allCategories(customCategories);
    return (
      <li className="flex flex-col gap-2 rounded-lg border border-primary/40 bg-card px-3 py-3">
        <Input
          autoFocus
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              saveEdit();
            } else if (e.key === 'Escape') {
              setEditing(false);
            }
          }}
          maxLength={200}
          aria-label="編輯標題"
          className="min-h-10"
        />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="編輯分類">
          {cats.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setEditCat(id)}
              aria-pressed={editCat === id}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                editCat === id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-9"
            onClick={() => setEditing(false)}
          >
            <X className="h-4 w-4" />
            取消
          </Button>
          <Button
            type="button"
            size="sm"
            className="min-h-9"
            onClick={saveEdit}
            disabled={!editTitle.trim()}
          >
            <Check className="h-4 w-4" />
            儲存
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li
      ref={drag?.setNodeRef}
      style={drag?.style}
      {...(drag?.attributes ?? {})}
      {...(drag?.listeners ?? {})}
      className={cn(
        'flex items-center rounded-lg border bg-card px-3',
        compact ? 'gap-1.5 py-2' : 'gap-2 py-3',
        urgent && !completed
          ? 'border-red-400/60 border-l-4 border-l-red-500'
          : 'border-border',
        drag && 'cursor-grab select-none active:cursor-grabbing',
        drag?.isDragging && 'opacity-60 shadow-lg',
      )}
    >
      {drag && (
        <span className="shrink-0 text-muted-foreground/40" aria-hidden>
          <GripVertical className="h-5 w-5" />
        </span>
      )}

      <button
        type="button"
        onClick={() =>
          completed ? onUncomplete?.(task.id) : onComplete?.(task.id)
        }
        onPointerDown={(e) => e.stopPropagation()}
        disabled={completed ? !onUncomplete : !onComplete}
        aria-label={completed ? `取消完成 ${task.title}` : `完成 ${task.title}`}
        aria-pressed={completed}
        className="shrink-0 text-primary disabled:cursor-default"
      >
        {completed ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground transition-colors hover:text-primary" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-medium ${completed ? 'text-muted-foreground line-through' : ''}`}
        >
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {urgent && !completed && (
            <Badge variant="outline" className="border-red-400/60 text-red-600">
              緊急
            </Badge>
          )}
          {dateBadge && (
            <Badge variant="outline" className="border-primary/30 text-primary">
              {dateBadge}
            </Badge>
          )}
          <Badge variant="muted">{catLabel}</Badge>
          {sourceLabel && (
            <Badge variant="outline" className="border-primary/30 text-primary">
              {sourceLabel}
            </Badge>
          )}
          {completed ? (
            <span className="text-xs font-medium text-primary">
              +{formatCurrency(task.reward)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              +{formatCurrency(task.reward)}
              {!compact && ' 待入帳'}
            </span>
          )}
        </div>
      </div>

      {onToggleUrgent && !completed && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'min-h-10 shrink-0 px-2 sm:px-3',
            urgent ? 'text-red-500' : 'text-muted-foreground/50',
          )}
          onClick={() => onToggleUrgent(task.id)}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={urgent ? `取消緊急 ${task.title}` : `標記緊急 ${task.title}`}
          aria-pressed={urgent}
        >
          <Flag className={cn('h-4 w-4', urgent && 'fill-current')} />
          {!compact && <span className="hidden sm:inline">緊急</span>}
        </Button>
      )}

      {onTogglePin && !completed && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'min-h-10 shrink-0 px-2 sm:px-3',
            task.pinned ? 'text-primary' : 'text-muted-foreground/50',
          )}
          onClick={() => onTogglePin(task.id)}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={task.pinned ? `移除任務 ${task.title}` : `設為任務 ${task.title}`}
          aria-pressed={!!task.pinned}
        >
          <Pin className={cn('h-4 w-4', task.pinned && 'fill-current')} />
          {!compact && <span className="hidden sm:inline">任務</span>}
        </Button>
      )}

      {editable && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-10 shrink-0 px-2 text-muted-foreground sm:px-3"
          onClick={startEdit}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={`編輯 ${task.title}`}
        >
          <Pencil className="h-4 w-4" />
          {!compact && <span className="hidden sm:inline">編輯</span>}
        </Button>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="min-h-10 shrink-0 px-2 text-muted-foreground sm:px-3"
        onClick={() => onDelete(task.id)}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label={`刪除 ${task.title}`}
      >
        <Trash2 className="h-4 w-4" />
        {!compact && <span className="hidden sm:inline">刪除</span>}
      </Button>
    </li>
  );
}
