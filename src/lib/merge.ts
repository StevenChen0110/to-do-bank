import type { AppData, JournalEntry } from '../types';

/** Union two lists by id; on id conflict the primary wins. */
function unionById<T extends { id: string }>(primary: T[], secondary: T[]): T[] {
  const map = new Map<string, T>();
  for (const x of secondary) map.set(x.id, x);
  for (const x of primary) map.set(x.id, x);
  return [...map.values()];
}

/** One journal entry per date; primary wins. */
function mergeJournal(primary: JournalEntry[], secondary: JournalEntry[]): JournalEntry[] {
  const map = new Map<string, JournalEntry>();
  for (const e of secondary) map.set(e.date, e);
  for (const e of primary) map.set(e.date, e);
  return [...map.values()];
}

/**
 * Combine two data blobs (e.g. web account + LINE) so nothing is lost.
 * `primary` takes precedence on conflicts — pass the authoritative side
 * (the web account, which the user actively uses) as primary.
 *
 * Collections are unioned by id (transactions union ⇒ combined balance),
 * so both histories are preserved. Settings prefer primary, but keep the
 * LINE nudge prefs if primary has none.
 */
export function mergeAppData(primary: AppData, secondary: AppData): AppData {
  return {
    version: 1,
    tasks: unionById(primary.tasks, secondary.tasks),
    wishes: unionById(primary.wishes, secondary.wishes),
    transactions: unionById(primary.transactions, secondary.transactions),
    journalEntries: mergeJournal(primary.journalEntries, secondary.journalEntries),
    habits: unionById(primary.habits, secondary.habits),
    projects: unionById(primary.projects, secondary.projects),
    settings: {
      ...primary.settings,
      nudge: primary.settings.nudge ?? secondary.settings.nudge,
    },
  };
}
