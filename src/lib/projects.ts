import type { Project, ProjectPhase, ProjectStep, Task } from '../types';

export const PHASES: { id: ProjectPhase; label: string; hint: string }[] = [
  { id: 'plan', label: '計畫 Plan', hint: '定義目標、拆解要做的事' },
  { id: 'do', label: '執行 Do', hint: '實際動手的步驟' },
  { id: 'check', label: '檢核 Check', hint: '檢視成果與落差' },
  { id: 'act', label: '調整 Act', hint: '根據結果調整下一步' },
];

export type StepStatus = 'planning' | 'pending' | 'done';

/** A step's live status, derived from its linked task when present. */
export function stepStatus(step: ProjectStep, tasks: Task[]): StepStatus {
  if (!step.taskId) return step.done ? 'done' : 'planning';
  const task = tasks.find((t) => t.id === step.taskId);
  if (!task) return step.done ? 'done' : 'planning'; // linked task was deleted
  return task.completedAt !== null ? 'done' : 'pending';
}

export function isStepDone(step: ProjectStep, tasks: Task[]): boolean {
  return stepStatus(step, tasks) === 'done';
}

/** Whether a step is currently pushed to an existing 待辦 task. */
export function isStepPushed(step: ProjectStep, tasks: Task[]): boolean {
  return !!step.taskId && tasks.some((t) => t.id === step.taskId);
}

export function projectProgress(
  project: Project,
  tasks: Task[],
): { done: number; total: number; pct: number } {
  const total = project.steps.length;
  const done = project.steps.filter((s) => isStepDone(s, tasks)).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function stepsForPhase(
  project: Project,
  phase: ProjectPhase,
): ProjectStep[] {
  return project.steps.filter((s) => s.phase === phase);
}
