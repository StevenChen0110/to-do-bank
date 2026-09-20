import { Check, Clock, X } from 'lucide-react';
import type { Project, Task } from '@/types';
import { labelForCategory } from '@/lib/categories';
import { PRIORITY_LABEL, priorityOf, projectForTask } from '@/lib/work';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';

interface WorkFocusProps {
  task: Task | null;
  projects: Project[];
  onComplete: (taskId: string) => void;
  onDefer: (taskId: string) => void;
  onExit: () => void;
}

/** Distraction-free execution mode: one task, two decisions. No timer. */
export function WorkFocus({ task, projects, onComplete, onDefer, onExit }: WorkFocusProps) {
  const customCategories = useAppStore((s) => s.settings.customCategories);

  return (
    <div className="flex min-h-[60vh] flex-col">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">
          FOCUS
        </span>
        <button
          type="button"
          onClick={onExit}
          aria-label="離開專注模式"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!task ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">今天沒有待執行的工作了。</p>
          <Button type="button" variant="outline" onClick={onExit}>
            返回
          </Button>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <h2 className="max-w-xl text-balance text-2xl font-semibold leading-snug sm:text-3xl">
            {task.title}
          </h2>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span className="rounded bg-muted px-1.5 py-0.5 font-semibold text-foreground">
              {PRIORITY_LABEL[priorityOf(task)]}
            </span>
            <span>{labelForCategory(task.category, customCategories)}</span>
            {projectForTask(task, projects) && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span>{projectForTask(task, projects)!.title}</span>
              </>
            )}
          </div>

          <div className="mt-10 flex w-full max-w-xs flex-col gap-2">
            <Button
              type="button"
              className="min-h-12 w-full text-base"
              onClick={() => onComplete(task.id)}
            >
              <Check className="h-5 w-5" />
              完成
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full"
              onClick={() => onDefer(task.id)}
            >
              <Clock className="h-4 w-4" />
              稍後
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
