import type { JournalEntry, Task } from '../types';

export const DIARY_TASK_TITLE = '日記完成';

export function findJournalByDate(
  entries: JournalEntry[],
  dateKey: string,
): JournalEntry | undefined {
  return entries.find((e) => e.date === dateKey);
}

/** True when the journal entry points at a task that still exists and is completed. */
export function isJournalCredited(
  entry: JournalEntry | undefined,
  tasks: Task[],
): boolean {
  const creditedTaskId = entry?.creditedTaskId;
  if (!creditedTaskId) {
    return false;
  }
  const task = tasks.find((t) => t.id === creditedTaskId);
  return task != null && task.completedAt !== null;
}

export function clearJournalCredit(entry: JournalEntry): JournalEntry {
  if (!entry.creditedTaskId) {
    return entry;
  }
  const { creditedTaskId: _removed, ...rest } = entry;
  return rest;
}

export function shouldCreditDiaryOnSave(
  content: string,
  diaryCountsAsTask: boolean,
  entry: JournalEntry | undefined,
  tasks: Task[],
): boolean {
  if (!diaryCountsAsTask) {
    return false;
  }
  if (content.trim().length === 0) {
    return false;
  }
  return !isJournalCredited(entry, tasks);
}
