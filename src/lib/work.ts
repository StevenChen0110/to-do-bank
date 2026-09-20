// Derivations for the Work OS experience. Pure helpers over the EXISTING
// Task / Project models — no new entities, no new persistence.
import type { Project, Task, TaskPriority } from '../types';
import { localDateString } from './dates';
import { projectProgress } from './projects';

/** Work-facing label for the existing priority model. */
export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: 'P0',
  medium: 'P1',
  low: 'P2',
};

export const PRIORITY_ORDER: TaskPriority[] = ['high', 'medium', 'low'];

export function priorityOf(task: Task): TaskPriority {
  return task.priority ?? 'medium';
}

export function priorityRank(task: Task): number {
  const p = priorityOf(task);
  return p === 'high' ? 0 : p === 'medium' ? 1 : 2;
}

/** Work excludes habit instances — those belong to 養成. */
export function isWorkTask(task: Task): boolean {
  return task.source?.type !== 'habit';
}

/** Pending (incomplete) work tasks. */
export function pendingWorkTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.completedAt === null && isWorkTask(t));
}

/**
 * Execution order: priority → scheduled date → existing manual order.
 * Respects the manual ordering the 待辦 board already maintains.
 */
export function byExecutionOrder(a: Task, b: Task): number {
  const pr = priorityRank(a) - priorityRank(b);
  if (pr !== 0) return pr;
  const d = a.scheduledDate.localeCompare(b.scheduledDate);
  if (d !== 0) return d;
  const ao = a.order ?? Number.MAX_SAFE_INTEGER;
  const bo = b.order ?? Number.MAX_SAFE_INTEGER;
  if (ao !== bo) return ao - bo;
  return a.createdAt.localeCompare(b.createdAt);
}

/** Today's work = scheduled today or earlier (overdue rolls forward), unparked. */
export function todayWorkTasks(tasks: Task[], todayKey = localDateString()): Task[] {
  return pendingWorkTasks(tasks)
    .filter((t) => !t.parked && t.scheduledDate <= todayKey)
    .sort(byExecutionOrder);
}

/** Inbox = captured but not yet scheduled into the day flow (parked), plus future unassigned. */
export function inboxTasks(tasks: Task[]): Task[] {
  return pendingWorkTasks(tasks)
    .filter((t) => t.parked)
    .sort(byExecutionOrder);
}

/** The single most important thing to do right now. */
export function focusTask(tasks: Task[], todayKey = localDateString()): Task | null {
  return todayWorkTasks(tasks, todayKey)[0] ?? null;
}

export interface ProjectSummary {
  project: Project;
  done: number;
  total: number;
  pct: number;
}

export function activeProjectSummaries(
  projects: Project[],
  tasks: Task[],
): ProjectSummary[] {
  return projects
    .filter((p) => p.status === 'active')
    .map((project) => ({ project, ...projectProgress(project, tasks) }))
    .sort((a, b) => b.pct - a.pct);
}

/** The project a task belongs to, via the existing ProjectStep.taskId link. */
export function projectForTask(task: Task, projects: Project[]): Project | null {
  if (task.source?.type === 'project') {
    const direct = projects.find((p) => p.id === task.source!.refId);
    if (direct) return direct;
  }
  return projects.find((p) => p.steps.some((s) => s.taskId === task.id)) ?? null;
}

/** Counts for the Today header line. */
export function todayCounts(tasks: Task[], todayKey = localDateString()) {
  const list = todayWorkTasks(tasks, todayKey);
  return {
    total: list.length,
    important: list.filter((t) => priorityOf(t) === 'high').length,
    overdue: list.filter((t) => t.scheduledDate < todayKey).length,
  };
}

/**
 * Work-domain category modules (spec §12). These are NOT a separate Work-only
 * data structure — they are seeded into the EXISTING custom-category system
 * via addCategory(), so they behave like any other CategoryDef everywhere.
 */
export const WORK_CATEGORY_PRESETS: { label: string; hint: string }[] = [
  { label: '新品導入 & 老品下市', hint: 'NPI / EOL 產品生命週期' },
  { label: 'Business / Revenue', hint: '營收、預測、定價' },
  { label: 'Promotion / Marketing', hint: '檔期、素材、通路活動' },
  { label: 'Customer Project', hint: '客戶專案與需求' },
  { label: 'Operations', hint: '供應、庫存、日常營運' },
];

/** Presets not yet present in the user's category list (by label). */
export function missingWorkPresets(existing: { label: string }[]): string[] {
  const have = new Set(existing.map((c) => c.label));
  return WORK_CATEGORY_PRESETS.filter((p) => !have.has(p.label)).map((p) => p.label);
}

/** Per-category execution stats for the Categories module cards. */
export interface CategoryStat {
  id: string;
  label: string;
  total: number;
  p0: number;
  today: number;
}

export function categoryStats(
  categories: { id: string; label: string }[],
  tasks: Task[],
  todayKey = localDateString(),
): CategoryStat[] {
  const pending = pendingWorkTasks(tasks);
  return categories.map((c) => {
    const mine = pending.filter((t) => t.category === c.id);
    return {
      id: c.id,
      label: c.label,
      total: mine.length,
      p0: mine.filter((t) => priorityOf(t) === 'high').length,
      today: mine.filter((t) => !t.parked && t.scheduledDate <= todayKey).length,
    };
  });
}

/** Tasks linked to a project through its steps (execution view). */
export function tasksForProject(project: Project, tasks: Task[]): Task[] {
  const ids = new Set(project.steps.map((s) => s.taskId).filter(Boolean) as string[]);
  return tasks.filter((t) => ids.has(t.id));
}
