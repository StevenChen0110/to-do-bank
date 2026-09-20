import { useState, type KeyboardEvent } from 'react';
import { ArrowLeft, Plus, Tags } from 'lucide-react';
import type { Project, Task } from '@/types';
import { allCategories } from '@/lib/categories';
import { byExecutionOrder, categoryStats, pendingWorkTasks } from '@/lib/work';
import { roleById } from '@/lib/workRoles';
import { WorkRoleSetup } from './WorkRoleSetup';
import { useAppStore } from '@/store/useAppStore';
import { useReward } from '@/context/RewardContext';
import { Input } from '@/components/ui/input';
import { WorkTaskItem, type WorkTaskActions } from './WorkTaskItem';
import { WorkQuickAdd } from './WorkQuickAdd';
import { cn } from '@/lib/utils';

const UNFILED = '__unfiled__';

interface WorkCategoriesProps {
  tasks: Task[];
  projects: Project[];
  todayKey: string;
  onComplete: (taskId: string) => void;
  onCyclePriority: (task: Task) => void;
  actions?: WorkTaskActions;
  /** Create a task directly inside a category module. */
  onAddInCategory: (title: string, categoryId: string) => void;
}

/**
 * Category modules — each work domain is its own small workspace (counts,
 * quick capture, focused list). Built on the EXISTING CategoryDef system;
 * the work presets are seeded through addCategory(), not a parallel model.
 */
export function WorkCategories({
  tasks,
  projects,
  todayKey,
  onComplete,
  onCyclePriority,
  actions,
  onAddInCategory,
}: WorkCategoriesProps) {
  const customCategories = useAppStore((s) => s.settings.customCategories);
  const addCategory = useAppStore((s) => s.addCategory);
  const { showToast } = useReward();
  const [openId, setOpenId] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [adding, setAdding] = useState(false);

  const workRole = useAppStore((s) => s.settings.workRole);
  const workCategoryIds = useAppStore((s) => s.settings.workCategoryIds);
  const setWorkRole = useAppStore((s) => s.setWorkRole);
  const [switching, setSwitching] = useState(false);

  const all = allCategories(customCategories);
  const role = roleById(workRole);
  const scoped = workCategoryIds ?? [];
  // Work shows only the role's modules (+ anything added here). Personal
  // categories stay in 待辦/養成 and are deliberately not surfaced.
  const categories = scoped.length > 0 ? all.filter((c) => scoped.includes(c.id)) : all;
  const stats = categoryStats(categories, tasks, todayKey);
  // Capture-first means new work lands in a default bucket that may sit
  // outside the role's modules. Surface it explicitly so nothing goes missing.
  const unfiled =
    scoped.length > 0
      ? pendingWorkTasks(tasks).filter((t) => !scoped.includes(t.category))
      : [];

  const commitTag = () => {
    const v = newTag.trim();
    setNewTag('');
    setAdding(false);
    if (!v) return;
    const def = addCategory(v);
    if (!def) return;
    // Keep custom additions inside the work scope (the 20%).
    if (scoped.length > 0) setWorkRole(workRole, [...scoped, def.id]);
    showToast('已新增分類', 'success', def.label);
  };

  // ── Drill-in: one category module ──────────────────────────────
  if (openId) {
    const isUnfiled = openId === UNFILED;
    const cat = categories.find((c) => c.id === openId);
    const list = (isUnfiled
      ? unfiled
      : pendingWorkTasks(tasks).filter((t) => t.category === openId)
    ).sort(byExecutionOrder);
    return (
      <div className="flex flex-col gap-4">
        <header>
          <button
            type="button"
            onClick={() => setOpenId(null)}
            className="mb-2 flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Categories
          </button>
          <h1 className="text-lg font-semibold">
            {isUnfiled ? '未分類' : cat?.label ?? '分類'}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {list.length === 0
              ? '目前沒有待執行的工作。'
              : isUnfiled
                ? `${list.length} 個尚未歸類 — 點工作可指定分類`
                : `${list.length} 個待執行`}
          </p>
        </header>

        <div className="rounded-xl border border-border bg-card">
          {list.length > 0 && (
            <ul className="divide-y divide-border/60 p-1">
              {list.map((task) => (
                <WorkTaskItem
                  key={task.id}
                  task={task}
                  projects={projects}
                  onComplete={onComplete}
                  onCyclePriority={onCyclePriority}
                  actions={actions}
                  overdueLabel={
                    !task.parked && task.scheduledDate < todayKey ? '逾期' : undefined
                  }
                />
              ))}
            </ul>
          )}
          {!isUnfiled && (
            <div className={cn('px-3', list.length > 0 && 'border-t border-border/60')}>
              <WorkQuickAdd
                onAdd={(title) => onAddInCategory(title, openId)}
                placeholder={`在「${cat?.label ?? ''}」新增工作…`}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Module grid ────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <Tags className="h-5 w-5 text-muted-foreground" />
            Categories
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            把工作分到適合的模組，點進去專注處理。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Plus className="mr-0.5 inline h-3.5 w-3.5" />
          新分類
        </button>
      </header>

      {adding && (
        <Input
          autoFocus
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              commitTag();
            } else if (e.key === 'Escape') {
              setNewTag('');
              setAdding(false);
            }
          }}
          onBlur={commitTag}
          placeholder="分類名稱，如：Customer Project"
          maxLength={20}
          aria-label="新分類名稱"
        />
      )}

      {!role ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <WorkRoleSetup />
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <span className="text-xs text-muted-foreground">職能模板</span>
          <span className="text-xs font-medium">{role.label}</span>
          <button
            type="button"
            onClick={() => setSwitching((v) => !v)}
            className="ml-auto text-[11px] text-muted-foreground transition-colors hover:text-primary"
          >
            {switching ? '收起' : '更換'}
          </button>
        </div>
      )}

      {role && switching && (
        <div className="rounded-xl border border-border bg-card p-3">
          <WorkRoleSetup compact onDone={() => setSwitching(false)} />
        </div>
      )}

      {unfiled.length > 0 && (
        <button
          type="button"
          onClick={() => setOpenId(UNFILED)}
          className="rounded-xl border border-dashed border-amber-500/50 bg-amber-50/40 p-3 text-left transition-colors hover:bg-amber-50/70 dark:bg-amber-950/20"
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-amber-700">未分類</span>
            <span className="text-lg font-semibold tabular-nums text-amber-700">
              {unfiled.length}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            剛捕捉的工作還沒歸類，點進去指定分類
          </p>
        </button>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {stats.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setOpenId(s.id)}
            className={cn(
              'rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40',
              s.total === 0 && 'opacity-60',
            )}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-medium">{s.label}</span>
              <span className="shrink-0 text-lg font-semibold tabular-nums">
                {s.total}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
              {s.p0 > 0 && (
                <span className="rounded bg-rose-500/10 px-1.5 py-0.5 font-semibold text-rose-600">
                  P0 {s.p0}
                </span>
              )}
              {s.today > 0 && <span>今天 {s.today}</span>}
              {s.total === 0 && <span>沒有待執行的工作</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
