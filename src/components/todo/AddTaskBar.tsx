import { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { localDateString } from '@/lib/dates';
import { Input } from '@/components/ui/input';
import { QuickAddInput } from './QuickAddInput';
import { cn } from '@/lib/utils';

/** Compact, collapsible "arrange a todo" bar — collapsed by default to save space. */
export function AddTaskBar() {
  const todayKey = localDateString();
  const [open, setOpen] = useState(false);
  const [planDate, setPlanDate] = useState(todayKey);

  return (
    <section className="rounded-xl border border-primary/30 bg-primary/5">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-1.5 text-sm font-semibold text-primary"
        >
          <Plus className="h-4 w-4" />
          安排待辦
        </button>
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
          aria-label={open ? '收合安排待辦' : '展開安排待辦'}
          className={cn('shrink-0 text-primary', !open && 'ml-auto')}
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </button>
      </div>
      {open && (
        <div className="px-4 pb-4">
          <QuickAddInput scheduledDate={planDate} />
          <p className="mt-2 text-[11px] text-muted-foreground">
            旗子＝緊急（浮到當天最前）、圖釘＝設為任務（置頂）。也可在「本週」看板每天底下快速加。
          </p>
        </div>
      )}
    </section>
  );
}
