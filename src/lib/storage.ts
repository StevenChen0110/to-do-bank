import { get } from 'idb-keyval';
import { supabase } from './supabase';
import type { AppData, AppSettings, LegacyWish, Wish } from '../types';
import { normalizeSettings } from './settings';

const IDB_KEY = 'todo-bank-app-data';

export const EMPTY_DATA: AppData = {
  version: 1,
  tasks: [],
  wishes: [],
  transactions: [],
  journalEntries: [],
  settings: normalizeSettings(undefined),
};

function normalizeWish(raw: LegacyWish): Wish {
  const redeemed = raw.redeemedAt !== null || raw.status === 'redeemed';
  return {
    id: raw.id,
    title: raw.title,
    cost: raw.cost,
    createdAt: raw.createdAt,
    redeemedAt: redeemed ? raw.redeemedAt ?? raw.createdAt : null,
  };
}

function sanitizeLoadedData(data: AppData): AppData {
  const tasks = data.tasks ?? [];
  const taskIds = new Set(tasks.map((t) => t.id));
  const journalEntries = (data.journalEntries ?? []).map((entry) => {
    if (entry.creditedTaskId && !taskIds.has(entry.creditedTaskId)) {
      const { creditedTaskId: _removed, ...rest } = entry;
      return rest;
    }
    return entry;
  });
  return { ...data, tasks, journalEntries };
}

function parseStoredData(raw: unknown): AppData {
  const stored = raw as AppData & {
    wishes?: LegacyWish[];
    settings?: AppSettings & { defaultTaskReward?: number };
  };
  if (!stored || stored.version !== 1) return { ...EMPTY_DATA };
  const wishes = (stored.wishes ?? []).map((w) =>
    'status' in w && w.status !== undefined ? normalizeWish(w as LegacyWish) : (w as Wish),
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

let _userId: string | null = null;

export function setCurrentUser(uid: string) {
  _userId = uid;
}

export async function loadAppData(): Promise<AppData> {
  if (!_userId) return { ...EMPTY_DATA };

  // Try loading from Supabase
  const { data: row } = await supabase
    .from('user_data')
    .select('data')
    .eq('user_id', _userId)
    .maybeSingle();

  if (row?.data) {
    return parseStoredData(row.data);
  }

  // No cloud data yet — check for local IndexedDB data to migrate
  const local = await get<unknown>(IDB_KEY);
  if (local) {
    const migrated = parseStoredData(local);
    await saveAppData(migrated);
    return migrated;
  }

  return { ...EMPTY_DATA };
}

export async function saveAppData(data: AppData): Promise<void> {
  if (!_userId) return;
  await supabase
    .from('user_data')
    .upsert({ user_id: _userId, data, updated_at: new Date().toISOString() });
}
