import { format, isSameDay, parseISO, startOfDay } from 'date-fns';
import type { Task } from '../types';

/** Calendar date in the user's local timezone (yyyy-MM-dd). */
export function localDateString(date: Date = new Date()): string {
  return format(startOfDay(date), 'yyyy-MM-dd');
}

/** Whether a task belongs on a local calendar day (scheduled or completed). */
export function isTaskOnLocalDay(task: Task, day: Date = new Date()): boolean {
  const dayKey = localDateString(day);
  if (task.scheduledDate === dayKey) {
    return true;
  }
  if (task.completedAt !== null) {
    return isSameDay(parseISO(task.completedAt), startOfDay(day));
  }
  return false;
}
