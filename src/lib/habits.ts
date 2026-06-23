import { addDays, parse } from 'date-fns';
import type { Habit, Task } from '../types';
import { localDateString } from './dates';

/** Weekday 0–6 (Sun–Sat) of a yyyy-MM-dd key. */
function weekdayOf(dateKey: string): number {
  return parse(dateKey, 'yyyy-MM-dd', new Date()).getDay();
}

/** Whether an active habit should produce a task on the given day. */
export function dueToday(habit: Habit, dateKey: string): boolean {
  if (!habit.active) return false;
  if (dateKey < habit.startDate) return false;
  return habit.weekdays.includes(weekdayOf(dateKey));
}

/** The habit's task instance for a given day, if it exists. */
export function habitTaskFor(
  tasks: Task[],
  habitId: string,
  dateKey: string,
): Task | undefined {
  return tasks.find(
    (t) =>
      t.source?.type === 'habit' &&
      t.source.refId === habitId &&
      t.scheduledDate === dateKey,
  );
}

/** Set of yyyy-MM-dd dates the habit was completed. */
export function completionDates(tasks: Task[], habitId: string): Set<string> {
  const done = new Set<string>();
  for (const t of tasks) {
    if (
      t.source?.type === 'habit' &&
      t.source.refId === habitId &&
      t.completedAt !== null
    ) {
      done.add(t.scheduledDate);
    }
  }
  return done;
}

/**
 * Consecutive completed days ending today. If today isn't completed yet the
 * streak counts up to yesterday (so an in-progress day doesn't break it).
 */
export function streakForHabit(
  tasks: Task[],
  habitId: string,
  todayKey: string,
): number {
  const done = completionDates(tasks, habitId);
  let streak = 0;
  let cursor = parse(todayKey, 'yyyy-MM-dd', new Date());
  if (!done.has(todayKey)) {
    cursor = addDays(cursor, -1); // today still open → start from yesterday
  }
  while (done.has(localDateString(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** How many distinct days the habit has been completed (for 21-day progress). */
export function completedCount(tasks: Task[], habitId: string): number {
  return completionDates(tasks, habitId).size;
}
