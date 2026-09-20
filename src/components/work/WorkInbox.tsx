import { Inbox as InboxIcon, CalendarPlus } from 'lucide-react';
import type { Project, Task } from '@/types';
import { inboxTasks } from '@/lib/work';
import { WorkTaskItem, type WorkTaskActions } from './WorkTaskItem';
import { WorkQuickAdd } from './WorkQuickAdd';

interface WorkInboxProps {
  tasks: Task[];
  projects: Project[];
  onComplete: (taskId: string) => void;
  onCyclePriority: (task: Task) => void;
  actions?: WorkTaskActions;
  onAdd: (title: string) => void;
  /** Pull a captured item into today's flow. */
  onMoveToToday: (taskId: string) => void;
}

/** Capture without organizing — items land here until scheduled. */
export function WorkInbox({
  tasks,
  projects,
  onComplete,
  onCyclePriority,
  actions,
  onAdd,
  onMoveToToday,
}: WorkInboxProps) {
  const list = inboxTasks(tasks);
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <InboxIcon className="h-5 w-5 text-muted-foreground" />
          Inbox
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          先記下來，之後再整理。{list.length > 0 && ` 目前 ${list.length} 項。`}
        </p>
      </header>

      <div className="rounded-xl border border-border bg-card">
        <div className="px-3">
          <WorkQuickAdd onAdd={onAdd} placeholder="想到什麼就先記下來…" />
        </div>
        {list.length > 0 && (
          <ul className="divide-y divide-border/60 border-t border-border/60 p-1">
            {list.map((task) => (
              <div key={task.id} className="flex items-start gap-1">
                <div className="min-w-0 flex-1">
                  <WorkTaskItem
                    task={task}
                    projects={projects}
                    onComplete={onComplete}
                    onCyclePriority={onCyclePriority}
                    actions={actions}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onMoveToToday(task.id)}
                  aria-label="移到今天"
                  title="移到今天"
                  className="mt-2 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                >
                  <CalendarPlus className="h-4 w-4" />
                </button>
              </div>
            ))}
          </ul>
        )}
      </div>

      {list.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Inbox 是空的 — 很好，代表都安排好了。
        </p>
      )}
    </div>
  );
}
