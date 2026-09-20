import { useState, type KeyboardEvent } from 'react';
import { ArrowLeft, Check, CircleDot, Play, Plus, Trash2 } from 'lucide-react';
import type { Project, ProjectPhase, ProjectStep, Task } from '@/types';
import { PHASES, isStepPushed, projectProgress, stepStatus } from '@/lib/projects';
import { useAppStore } from '@/store/useAppStore';
import { useReward } from '@/context/RewardContext';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface WorkProjectDetailProps {
  project: Project;
  tasks: Task[];
  onBack: () => void;
}

/**
 * Execution workspace for ONE existing Project. Operates entirely through the
 * existing store actions (addStep / updateStep / deleteStep / pushStepToTodo)
 * — no new project model, no duplicate detail state.
 */
export function WorkProjectDetail({ project, tasks, onBack }: WorkProjectDetailProps) {
  const addStep = useAppStore((s) => s.addStep);
  const updateStep = useAppStore((s) => s.updateStep);
  const deleteStep = useAppStore((s) => s.deleteStep);
  const pushStepToTodo = useAppStore((s) => s.pushStepToTodo);
  const updateProject = useAppStore((s) => s.updateProject);
  const { showToast } = useReward();
  const [draft, setDraft] = useState('');

  const { done, total, pct } = projectProgress(project, tasks);
  const isPdca = project.template === 'pdca';

  const addFromDraft = (phase?: ProjectPhase) => {
    const t = draft.trim();
    if (!t) return;
    addStep(project.id, t, phase);
    setDraft('');
  };

  const renderStep = (step: ProjectStep) => {
    const status = stepStatus(step, tasks);
    const pushed = isStepPushed(step, tasks);
    const isDone = status === 'done';
    return (
      <li key={step.id} className="group flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50">
        <button
          type="button"
          onClick={() => updateStep(project.id, step.id, { done: !step.done })}
          aria-label={isDone ? '標記未完成' : '標記完成'}
          className={cn(
            'mt-0.5 shrink-0 transition-colors',
            isDone ? 'text-primary' : 'text-muted-foreground/50 hover:text-primary',
          )}
        >
          {isDone ? <Check className="h-4 w-4" /> : <CircleDot className="h-4 w-4" />}
        </button>
        <span
          className={cn(
            'min-w-0 flex-1 text-sm leading-snug',
            isDone && 'text-muted-foreground line-through',
          )}
        >
          {step.title}
        </span>
        {!isDone && !pushed && (
          <button
            type="button"
            onClick={() => {
              pushStepToTodo(project.id, step.id);
              showToast('已排入今天的工作', 'success', step.title);
            }}
            className="shrink-0 rounded-md border border-primary/40 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary opacity-0 transition-opacity hover:bg-primary/10 group-hover:opacity-100 focus:opacity-100"
          >
            <Play className="mr-0.5 inline h-3 w-3" />
            執行
          </button>
        )}
        {pushed && !isDone && (
          <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            進行中
          </span>
        )}
        <button
          type="button"
          onClick={() => deleteStep(project.id, step.id)}
          aria-label="刪除步驟"
          className="shrink-0 rounded-md p-1 text-muted-foreground/40 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <header>
        <button
          type="button"
          onClick={onBack}
          className="mb-2 flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Projects
        </button>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-lg font-semibold">{project.title}</h1>
          <span className="shrink-0 text-lg font-semibold tabular-nums">{pct}%</span>
        </div>
        {project.goal && (
          <p className="mt-0.5 text-sm text-muted-foreground">{project.goal}</p>
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
      </header>

      <div className="rounded-xl border border-border bg-card p-2">
        {isPdca ? (
          PHASES.map(({ id, label }) => {
            const steps = project.steps.filter((s) => s.phase === id);
            return (
              <section key={id} className="mb-2 last:mb-0">
                <h3 className="px-2 py-1 text-[11px] font-semibold tracking-wide text-muted-foreground">
                  {label}
                </h3>
                {steps.length === 0 ? (
                  <p className="px-2 pb-1 text-xs text-muted-foreground/60">—</p>
                ) : (
                  <ul>{steps.map(renderStep)}</ul>
                )}
                <button
                  type="button"
                  onClick={() => addFromDraft(id)}
                  className="mx-2 mb-1 text-[11px] text-muted-foreground transition-colors hover:text-primary"
                >
                  ＋ 加到 {label.split(' ')[0]}
                </button>
              </section>
            );
          })
        ) : project.steps.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            還沒有步驟，在下方新增第一個。
          </p>
        ) : (
          <ul>{project.steps.map(renderStep)}</ul>
        )}

        <div className="flex items-center gap-2 border-t border-border/60 px-2 pt-2">
          <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                addFromDraft(isPdca ? 'do' : undefined);
              }
            }}
            placeholder={isPdca ? '新增步驟（預設進「執行」）…' : '新增步驟…'}
            maxLength={200}
            aria-label="新增步驟"
            className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      {project.status === 'active' && total > 0 && done === total && (
        <button
          type="button"
          onClick={() => {
            updateProject(project.id, { status: 'done' });
            showToast('專案已完成 🎉', 'success', project.title);
            onBack();
          }}
          className="rounded-xl border border-primary/40 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
        >
          全部步驟已完成 — 標記專案完成
        </button>
      )}
    </div>
  );
}
