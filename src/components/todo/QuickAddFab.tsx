import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { QuickAddInput } from './QuickAddInput';
import { cn } from '@/lib/utils';

interface QuickAddFabProps {
  /** Day the new task is added to. */
  scheduledDate: string;
  /** Human label for the target day, shown in the panel header. */
  dateLabel: string;
}

/**
 * Floating "＋" button pinned to the bottom-right. Tapping opens a compact
 * add panel that closes itself after a task is added — an on-demand surface
 * instead of a permanent block eating the top of the page.
 */
export function QuickAddFab({ scheduledDate, dateLabel }: QuickAddFabProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="關閉新增"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] lg:bg-transparent lg:backdrop-blur-0"
        />
      )}

      <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-50 flex flex-col items-end gap-2 lg:bottom-6">
        {open && (
          <div className="w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-3 shadow-xl">
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                <Plus className="h-4 w-4" />
                在「{dateLabel}」新增
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="關閉"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <QuickAddInput scheduledDate={scheduledDate} onAdded={() => setOpen(false)} />
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? '關閉新增' : '新增待辦'}
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-90',
            open && 'rotate-45',
          )}
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
    </>
  );
}
