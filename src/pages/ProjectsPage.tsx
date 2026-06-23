import { useState, type KeyboardEvent } from 'react';
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Flag,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';
import type { Project, ProjectPhase, ProjectStep, ProjectTemplate } from '@/types';
import {
  PHASES,
  projectProgress,
  stepStatus,
  stepsForPhase,
} from '@/lib/projects';
import { formatPinnedGoalNarrative, isPinnedWishActive } from '@/lib/pinnedWish';
import { playDepositChime, unlockAudioFromGesture } from '@/lib/sound';
import { useAppStore } from '@/store/useAppStore';
import { useReward } from '@/context/RewardContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function ProjectsPage() {
  const projects = useAppStore((s) => s.projects);
  const tasks = useAppStore((s) => s.tasks);
  const settings = useAppStore((s) => s.settings);
  const wishes = useAppStore((s) => s.wishes);
  const pinnedWishId = useAppStore((s) => s.settings.pinnedWishId);
  const addProject = useAppStore((s) => s.addProject);
  const updateProject = useAppStore((s) => s.updateProject);
  const deleteProject = useAppStore((s) => s.deleteProject);
  const addStep = useAppStore((s) => s.addStep);
  const updateStep = useAppStore((s) => s.updateStep);
  const deleteStep = useAppStore((s) => s.deleteStep);
  const pushStepToTodo = useAppStore((s) => s.pushStepToTodo);
  const completeTask = useAppStore((s) => s.completeTask);
  const { showToast } = useReward();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [template, setTemplate] = useState<ProjectTemplate>('pdca');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [showDone, setShowDone] = useState(false);

  const active = projects.filter((p) => p.status === 'active');
  const finished = projects.filter((p) => p.status !== 'active');

  const submitProject = () => {
    if (!title.trim()) return;
    addProject({ title, goal, template });
    setTitle('');
    setGoal('');
    setTemplate('pdca');
    setOpen(false);
  };

  const draftKey = (projectId: string, phase?: ProjectPhase) =>
    `${projectId}:${phase ?? 'flat'}`;

  const submitStep = (projectId: string, phase?: ProjectPhase) => {
    const key = draftKey(projectId, phase);
    const value = drafts[key] ?? '';
    if (!value.trim()) return;
    addStep(projectId, value, phase);
    setDrafts((d) => ({ ...d, [key]: '' }));
  };

  const completeStep = (project: Project, step: ProjectStep) => {
    const status = stepStatus(step, tasks);
    if (status === 'done') return;
    if (status === 'planning') {
      updateStep(project.id, step.id, { done: true });
      return;
    }
    // pending → complete the linked task (deposit)
    if (!step.taskId) return;
    unlockAudioFromGesture();
    const task = tasks.find((t) => t.id === step.taskId);
    completeTask(step.taskId);
    if (settings.soundEnabled) playDepositChime();
    let detail: string | undefined;
    if (isPinnedWishActive(wishes, pinnedWishId)) {
      const pinned = wishes.find((w) => w.id === pinnedWishId);
      if (pinned) {
        const bal = useAppStore.getState().transactions.reduce((s, tx) => s + tx.amount, 0);
        detail = formatPinnedGoalNarrative(pinned, bal);
      }
    }
    showToast(`+NT$${task?.reward ?? settings.smallTaskReward} 已入帳`, 'success', detail);
  };

  const renderStep = (project: Project, step: ProjectStep) => {
    const status = stepStatus(step, tasks);
    const done = status === 'done';
    return (
      <li key={step.id} className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => completeStep(project, step)}
          disabled={done}
          aria-label={done ? '已完成' : `完成 ${step.title}`}
          className="shrink-0 text-primary disabled:cursor-default"
        >
          {done ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground transition-colors hover:text-primary" />
          )}
        </button>
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-sm',
            done && 'text-muted-foreground line-through',
          )}
        >
          {step.title}
        </span>
        {status === 'pending' && (
          <Badge variant="muted" className="shrink-0 text-[10px]">
            待辦中
          </Badge>
        )}
        {status === 'planning' && (
          <button
            type="button"
            onClick={() => pushStepToTodo(project.id, step.id)}
            className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] text-primary transition-colors hover:bg-primary/10"
            aria-label="送進待辦"
          >
            <Send className="h-3 w-3" />
            送進待辦
          </button>
        )}
        <button
          type="button"
          onClick={() => deleteStep(project.id, step.id)}
          aria-label={`刪除 ${step.title}`}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </li>
    );
  };

  const stepInput = (project: Project, phase?: ProjectPhase) => {
    const key = draftKey(project.id, phase);
    return (
      <div className="mt-2 flex gap-2">
        <Input
          value={drafts[key] ?? ''}
          onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submitStep(project.id, phase);
            }
          }}
          placeholder="新增步驟…"
          maxLength={120}
          className="h-8 flex-1 text-sm"
          aria-label="新增步驟"
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 shrink-0"
          onClick={() => submitStep(project.id, phase)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── 新增專案 ──────────────────────────────── */}
      <section className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <button
          type="button"
          className="flex w-full items-center justify-between"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Plus className="h-4 w-4" />
            新增專案
          </span>
          {open ? (
            <ChevronUp className="h-4 w-4 text-primary/60" />
          ) : (
            <ChevronDown className="h-4 w-4 text-primary/60" />
          )}
        </button>

        {open && (
          <div className="mt-3 flex flex-col gap-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="專案名稱"
              maxLength={80}
              className="min-h-11"
              aria-label="專案名稱"
            />
            <Input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="完成的樣子（選填，如「上線並有 10 位使用者」）"
              maxLength={200}
              className="h-10"
              aria-label="專案目標"
            />
            <div className="flex gap-2" role="group" aria-label="規劃模板">
              {(
                [
                  { id: 'pdca', label: 'PDCA', hint: '計畫→執行→檢核→調整' },
                  { id: 'checklist', label: '簡單清單', hint: '直接列步驟' },
                ] as const
              ).map(({ id, label, hint }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTemplate(id)}
                  className={cn(
                    'flex-1 rounded-lg border px-3 py-2 text-left transition-colors',
                    template === id
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card hover:border-primary/40',
                  )}
                  aria-pressed={template === id}
                >
                  <span className={cn('block text-xs font-semibold', template === id ? 'text-primary' : 'text-foreground')}>
                    {label}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">{hint}</span>
                </button>
              ))}
            </div>
            <Button type="button" className="h-11" onClick={submitProject} disabled={!title.trim()}>
              建立專案
            </Button>
          </div>
        )}
      </section>

      {/* ── 專案列表 ──────────────────────────────── */}
      {active.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          還沒有專案。點上方「新增專案」，用模板規劃，再把步驟送進待辦。
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {active.map((project) => {
            const { done, total, pct } = projectProgress(project, tasks);
            return (
              <section key={project.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">{project.title}</h3>
                    {project.goal && (
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <Flag className="h-3 w-3 shrink-0" />
                        {project.goal}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {done}/{total}
                  </span>
                </div>

                {/* progress */}
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* steps */}
                <div className="mt-3 flex flex-col gap-3">
                  {project.template === 'pdca' ? (
                    PHASES.map((phase) => (
                      <div key={phase.id}>
                        <p className="text-xs font-semibold text-foreground">{phase.label}</p>
                        <p className="text-[10px] text-muted-foreground">{phase.hint}</p>
                        <ul className="mt-1.5 flex flex-col gap-1.5">
                          {stepsForPhase(project, phase.id).map((s) => renderStep(project, s))}
                        </ul>
                        {stepInput(project, phase.id)}
                      </div>
                    ))
                  ) : (
                    <div>
                      <ul className="flex flex-col gap-1.5">
                        {project.steps.map((s) => renderStep(project, s))}
                      </ul>
                      {stepInput(project)}
                    </div>
                  )}
                </div>

                {/* actions */}
                <div className="mt-3 flex justify-end gap-1 border-t border-border pt-2">
                  <button
                    type="button"
                    onClick={() => updateProject(project.id, { status: 'done' })}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    完成專案
                  </button>
                  <button
                    type="button"
                    onClick={() => updateProject(project.id, { status: 'archived' })}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    封存
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteProject(project.id)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    刪除
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* ── 已完成 / 封存 ────────────────────────── */}
      {finished.length > 0 && (
        <section className="rounded-xl border border-border bg-card">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            className="flex w-full items-center justify-between p-4"
            aria-expanded={showDone}
          >
            <span className="text-sm font-semibold text-muted-foreground">
              已完成 / 封存（{finished.length}）
            </span>
            {showDone ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {showDone && (
            <ul className="flex flex-col gap-2 px-4 pb-4">
              {finished.map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  <span className="flex-1 truncate text-sm text-muted-foreground">
                    {p.status === 'done' ? '✅ ' : '📦 '}
                    {p.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateProject(p.id, { status: 'active' })}
                    className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    復原
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteProject(p.id)}
                    className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    刪除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
