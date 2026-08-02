import { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import type { Task } from '@/types';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { QuickAddInput } from './QuickAddInput';
import { OverdueRail } from './OverdueRail';
import { cn } from '@/lib/utils';

interface AddTaskBarProps {
  /** Overdue tasks — nested under 安排; drag into a week day to reschedule. */
  overdueTasks: Task[];
  todayKey: string;
  overdueDraggable?: boolean;
  onComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onMoveToToday: (taskId: string) => void;
  onReschedule: (taskId: string, date: string) => void;
}

/**
 * 安排 — collapsible planning panel. Expand to add a todo and to reach 逾期
 * (which itself expands to the overdue items you can drag onto a day).
 */
export function AddTaskBar({
  overdueTasks,
  todayKey,
  overdueDraggable = false,
  onComplete,
  onDelete,
  onMoveToToday,
  onReschedule,
}: AddTaskBarProps) {
  const [open, setOpen] = useState(false);
  const [planDate, setPlanDate] = useState(todayKey);

  return (
    <section className="overflow-hidden rounded-xl border border-primary/30 bg-primary/5">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-1.5 text-sm font-semibold text-primary"
        >
          <Plus className="h-4 w-4" />
          安排
        </button>
        {overdueTasks.length > 0 && (
          <Badge variant="outline" className="border-amber-500/50 text-amber-600">
            逾期 {overdueTasks.length}
          </Badge>
        )}
        {open && (
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
          aria-expanded={open}
          aria-label={open ? '收合安排' : '展開安排'}
          className={cn('shrink-0 text-primary', !open && 'ml-auto')}
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </button>
      </div>

      {open && (
        <div className="border-t border-primary/10 px-4 py-3">
          <QuickAddInput scheduledDate={planDate} />
          <p className="mt-2 text-[11px] text-muted-foreground">
            旗子＝緊急（浮到當天最前）、圖釘＝設為任務（置頂）。也可在「本週」看板每天底下快速加。
          </p>
        </div>
      )}

      {/* 逾期：展開安排後可見，再展開看到細項（可拖到某天） */}
      {open && overdueTasks.length > 0 && (
        <div className="border-t border-primary/10">
          <OverdueRail
            embedded
            defaultOpen={false}
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
