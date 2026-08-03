import { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import type { Task } from '@/types';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { QuickAddInput } from './QuickAddInput';
import { OverdueRail } from './OverdueRail';
import { cn } from '@/lib/utils';

/** Droppable id for the staging ("暫放") area. */
export const STAGING_ID = 'staging';

interface AddTaskBarProps {
  /** Overdue + parked tasks — the 暫放 area; drag a day task here to park it. */
  overdueTasks: Task[];
  todayKey: string;
  overdueDraggable?: boolean;
  /** Force the panel + staging open (e.g. while a drag is in progress). */
  forceOpen?: boolean;
  onComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onMoveToToday: (taskId: string) => void;
  onReschedule: (taskId: string, date: string) => void;
}

/**
 * 安排 — collapsible planning panel: add a todo, and a 暫放 area you can drag
 * tasks into and out of. Opens automatically while dragging so parking is easy.
 */
export function AddTaskBar({
  overdueTasks,
  todayKey,
  overdueDraggable = false,
  forceOpen = false,
  onComplete,
  onDelete,
  onMoveToToday,
  onReschedule,
}: AddTaskBarProps) {
  const [open, setOpen] = useState(false);
  const [planDate, setPlanDate] = useState(todayKey);
  const isOpen = open || forceOpen;

  return (
    <section className="overflow-hidden rounded-xl border border-primary/30 bg-primary/5">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={isOpen}
          className="flex items-center gap-1.5 text-sm font-semibold text-primary"
        >
          <Plus className="h-4 w-4" />
          安排
        </button>
        {overdueTasks.length > 0 && (
          <Badge variant="outline" className="border-amber-500/50 text-amber-600">
            暫放 {overdueTasks.length}
          </Badge>
        )}
        {isOpen && (
          <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            安排到
            <Input
              type="date"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value || todayKey)}
              className="h-8 w-[8.5rem] text-xs"
              aria-label="安排日期"
            />
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={isOpen}
          aria-label={isOpen ? '收合安排' : '展開安排'}
          className={cn('shrink-0 text-primary', !isOpen && 'ml-auto')}
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-primary/10 px-4 py-3">
          <QuickAddInput scheduledDate={planDate} />
          <p className="mt-2 text-[11px] text-muted-foreground">
            旗子＝緊急、圖釘＝設為任務。把日子裡的待辦拖到「暫放」可先擱著，之後再拖回某天。
          </p>
        </div>
      )}

      {/* 暫放區：可把待辦拖進來擱著，也可拖出去排到某天 */}
      {isOpen && (
        <div className="border-t border-primary/10">
          <OverdueRail
            embedded
            droppableId={STAGING_ID}
            forceOpen={forceOpen}
            draggable={overdueDraggable}
            tasks={overdueTasks}
            todayKey={todayKey}
            onComplete={onComplete}
            onDelete={onDelete}
            onMoveToToday={onMoveToToday}
            onReschedule={onReschedule}
          />
        </div>
      )}
    </section>
  );
}
