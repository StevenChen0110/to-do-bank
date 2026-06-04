import { get, set } from 'idb-keyval';
import type { AppData, AppSettings, LegacyWish, Wish } from '../types';
import { normalizeSettings } from './settings';

const STORAGE_KEY = 'todo-bank-app-data';

export const EMPTY_DATA: AppData = {
  version: 1,
  tasks: [],
  wishes: [],
  transactions: [],
  journalEntries: [],
  settings: normalizeSettings(undefined),
};

function normalizeWish(raw: LegacyWish): Wish {
  const redeemed =
    raw.redeemedAt !== null ||
    raw.status === 'redeemed';
  return {
    id: raw.id,
    title: raw.title,
    cost: raw.cost,
    createdAt: raw.createdAt,
    redeemedAt: redeemed
      ? raw.redeemedAt ?? raw.createdAt
      : null,
  };
}

function sanitizeLoadedData(data: AppData): AppData {
  const tasks = (data.tasks ?? []).filter((task) => task.completedAt !== null);
  const taskIds = new Set(tasks.map((task) => task.id));

  const journalEntries = (data.journalEntries ?? []).map((entry) => {
    if (entry.creditedTaskId && !taskIds.has(entry.creditedTaskId)) {
      const { creditedTaskId: _removed, ...rest } = entry;
      return rest;
    }
    return entry;
  });

  return { ...data, tasks, journalEntries };
}

export async function loadAppData(): Promise<AppData> {
  const stored = await get<
    AppData & {
      wishes?: LegacyWish[];
      settings?: AppSettings & { defaultTaskReward?: number };
      journalEntries?: AppData['journalEntries'];
    }
  >(STORAGE_KEY);
  if (!stored || stored.version !== 1) {
    return { ...EMPTY_DATA };
  }
  const wishes = (stored.wishes ?? []).map((w) =>
    'status' in w && w.status !== undefined
      ? normalizeWish(w as LegacyWish)
      : (w as Wish),
  );
  return sanitizeLoadedData({
    version: 1,
    tasks: stored.tasks ?? [],
    wishes,
    transactions: stored.transactions ?? [],
    journalEntries: stored.journalEntries ?? [],
    settings: normalizeSettings(stored.settings),
  });
}

export async function saveAppData(data: AppData): Promise<void> {
  await set(STORAGE_KEY, data);
}
