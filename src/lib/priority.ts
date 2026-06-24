import type { TaskPriority } from '../types';

export const PRIORITY_ORDER: TaskPriority[] = ['high', 'medium', 'low'];

export const PRIORITY_META: Record<
  TaskPriority,
  { label: string; dot: string; chip: string }
> = {
  high: { label: '高', dot: 'bg-red-500', chip: 'border-red-500/40 text-red-600' },
  medium: { label: '中', dot: 'bg-amber-500', chip: 'border-amber-500/40 text-amber-600' },
  low: { label: '低', dot: 'bg-muted-foreground/50', chip: 'border-border text-muted-foreground' },
};

export function taskPriority(p: TaskPriority | undefined): TaskPriority {
  return p ?? 'medium';
}

/** Cycle high → medium → low → high for one-tap adjustment. */
export function nextPriority(p: TaskPriority | undefined): TaskPriority {
  const order = PRIORITY_ORDER;
  const i = order.indexOf(taskPriority(p));
  return order[(i + 1) % order.length];
}
