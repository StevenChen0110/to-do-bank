import { get, set } from 'idb-keyval';
import type { AppData, AppSettings, LegacyWish, Wish } from '../types';

const STORAGE_KEY = 'todo-bank-app-data';

export const EMPTY_DATA: AppData = {
  version: 1,
  tasks: [],
  wishes: [],
  transactions: [],
  settings: {
    defaultTaskReward: 10,
    pinnedWishId: null,
  } satisfies AppSettings,
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

export async function loadAppData(): Promise<AppData> {
  const stored = await get<AppData & { wishes?: LegacyWish[] }>(STORAGE_KEY);
  if (!stored || stored.version !== 1) {
    return { ...EMPTY_DATA };
  }
  const wishes = (stored.wishes ?? []).map((w) =>
    'status' in w && w.status !== undefined
      ? normalizeWish(w as LegacyWish)
      : (w as Wish),
  );
  return {
    version: 1,
    tasks: stored.tasks ?? [],
    wishes,
    transactions: stored.transactions ?? [],
    settings: {
      ...EMPTY_DATA.settings,
      ...stored.settings,
      defaultTaskReward:
        stored.settings?.defaultTaskReward ?? EMPTY_DATA.settings.defaultTaskReward,
      pinnedWishId: stored.settings?.pinnedWishId ?? null,
    },
  };
}

export async function saveAppData(data: AppData): Promise<void> {
  await set(STORAGE_KEY, data);
}
