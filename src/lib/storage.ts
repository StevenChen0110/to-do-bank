import { get, set } from 'idb-keyval';
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
  habits: [],
  projects: [],
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
    habits: stored.habits ?? [],
    projects: stored.projects ?? [],
    settings: normalizeSettings(stored.settings),
  });
}

let _userId: string | null = null;

export function setCurrentUser(uid: string | null) {
  _userId = uid && uid.length > 0 ? uid : null;
}

/** Per-user offline mirror of the last successfully loaded cloud blob. */
function offlineKey(userId: string): string {
  return `${IDB_KEY}:${userId}`;
}

export async function loadAppData(): Promise<AppData> {
  if (!_userId) return { ...EMPTY_DATA };

  // Try loading from Supabase. Offline (or Supabase unreachable) this throws
  // or returns an error — the installed PWA must still open, so fall back to
  // the local mirror instead of hanging on the loading screen.
  try {
    const { data: row, error } = await supabase
      .from('user_data')
      .select('data')
      .eq('user_id', _userId)
      .maybeSingle();
    if (error) throw error;

    if (row?.data) {
      const parsed = parseStoredData(row.data);
      // Mirror locally so the next cold start works without a network.
      void set(offlineKey(_userId), row.data).catch(() => {});
      return parsed;
    }
  } catch {
    const cached = await get<unknown>(offlineKey(_userId)).catch(() => undefined);
    if (cached) return parseStoredData(cached);
    return { ...EMPTY_DATA };
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
  // Always mirror locally first so offline edits survive a cold start.
  void set(offlineKey(_userId), data).catch(() => {});
  try {
    await supabase
      .from('user_data')
      .upsert({ user_id: _userId, data, updated_at: new Date().toISOString() });
  } catch {
    // Offline — the local mirror holds the change; next successful save syncs.
  }
}

/** Load a specific user_id's blob (used when merging accounts at link time). */
export async function loadAppDataFor(userId: string): Promise<AppData> {
  const { data: row } = await supabase
    .from('user_data')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();
  return row?.data ? parseStoredData(row.data) : { ...EMPTY_DATA };
}

/** Write a blob to a specific user_id (used when merging accounts at link time). */
export async function saveAppDataFor(userId: string, data: AppData): Promise<void> {
  await supabase
    .from('user_data')
    .upsert({ user_id: userId, data, updated_at: new Date().toISOString() });
}
