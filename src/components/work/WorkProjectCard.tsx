import type { ProjectSummary } from '@/lib/work';
import { cn } from '@/lib/utils';

interface WorkProjectCardProps {
  summary: ProjectSummary;
  onOpen?: () => void;
}

/** Concise, execution-oriented project progress card. */
export function WorkProjectCard({ summary, onOpen }: WorkProjectCardProps) {
  const { project, done, total, pct } = summary;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'w-full rounded-xl border border-border bg-card p-3 text-left transition-colors',
        onOpen && 'hover:border-primary/40',
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-sm font-medium">{project.title}</span>
        <span className="shrink-0 text-sm font-semibold tabular-nums">{pct}%</span>
      </div>
      {project.goal && (
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{project.goal}</p>
      )}
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground tabular-nums">
        {done} / {total} tasks
      </p>
    </button>
  );
}
