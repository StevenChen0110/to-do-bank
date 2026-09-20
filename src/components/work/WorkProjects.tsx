import { useState, type KeyboardEvent } from 'react';
import { FolderKanban, Plus, Sparkles } from 'lucide-react';
import type { Project, Task } from '@/types';
import { activeProjectSummaries } from '@/lib/work';
import { roleById, type RoleProjectBlueprint } from '@/lib/workRoles';
import { projectProgress } from '@/lib/projects';
import { useAppStore } from '@/store/useAppStore';
import { useReward } from '@/context/RewardContext';
import { Input } from '@/components/ui/input';
import { WorkProjectCard } from './WorkProjectCard';
import { WorkProjectDetail } from './WorkProjectDetail';
import { cn } from '@/lib/utils';

interface WorkProjectsProps {
  tasks: Task[];
  projects: Project[];
}

/** Project module: list → drill into a real execution workspace. */
export function WorkProjects({ tasks, projects }: WorkProjectsProps) {
  const addProject = useAppStore((s) => s.addProject);
  const addStep = useAppStore((s) => s.addStep);
  const workRole = useAppStore((s) => s.settings.workRole);
  const { showToast } = useReward();
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);

  const open = openId ? projects.find((p) => p.id === openId) ?? null : null;
  if (open) {
    return (
      <WorkProjectDetail project={open} tasks={tasks} onBack={() => setOpenId(null)} />
    );
  }

  const active = activeProjectSummaries(projects, tasks);
  const finished = projects
    .filter((p) => p.status === 'done')
    .map((project) => ({ project, ...projectProgress(project, tasks) }));

  const role = roleById(workRole);
  const usedTitles = new Set(projects.map((p) => p.title));
  const blueprints = (role?.projects ?? []).filter((b) => !usedTitles.has(b.title));

  /** Materialise a blueprint into a real Project + ProjectSteps. */
  const createFromBlueprint = (b: RoleProjectBlueprint) => {
    addProject({ title: b.title, goal: b.goal, template: 'checklist' });
    const created = useAppStore
      .getState()
      .projects.find((p) => p.title === b.title && p.steps.length === 0);
    if (created) for (const step of b.steps) addStep(created.id, step);
    showToast('已建立專案', 'success', `${b.title} · ${b.steps.length} 個步驟`);
  };

  const create = () => {
    const t = draft.trim();
    setDraft('');
    setAdding(false);
    if (!t) return;
    addProject({ title: t, template: 'checklist' });
    showToast('已建立專案', 'success', t);
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <FolderKanban className="h-5 w-5 text-muted-foreground" />
            Projects
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            點專案進入工作區：拆步驟、排入今天、追蹤完成度。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Plus className="mr-0.5 inline h-3.5 w-3.5" />
          新專案
        </button>
      </header>

      {adding && (
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              create();
            } else if (e.key === 'Escape') {
              setDraft('');
              setAdding(false);
            }
          }}
          onBlur={create}
          placeholder="專案名稱，如：C701 新品導入"
          maxLength={80}
          aria-label="新專案名稱"
        />
      )}

      {blueprints.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-1 text-[11px] font-semibold tracking-[0.15em] text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            {role?.label} 專案範本
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {blueprints.map((b) => (
              <button
                key={b.title}
                type="button"
                onClick={() => createFromBlueprint(b)}
                className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-left transition-colors hover:bg-primary/10"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{b.title}</span>
                  <Plus className="h-4 w-4 shrink-0 text-primary" />
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{b.goal}</p>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {b.steps.length} 個步驟已拆好
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {active.length === 0 && !adding ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          還沒有進行中的專案。用上方範本一鍵建立，或點右上角「新專案」。
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {active.map((s) => (
            <WorkProjectCard
              key={s.project.id}
              summary={s}
              onOpen={() => setOpenId(s.project.id)}
            />
          ))}
        </div>
      )}

      {finished.length > 0 && (
        <section>
          <h2 className="mb-2 text-[11px] font-semibold tracking-[0.15em] text-muted-foreground">
            DONE
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {finished.map((s) => (
              <div key={s.project.id} className={cn('opacity-60 saturate-50')}>
                <WorkProjectCard summary={s} onOpen={() => setOpenId(s.project.id)} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
