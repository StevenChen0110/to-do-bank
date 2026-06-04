import type { AppSettings } from '../types';

export const REWARD_MIN = 1;
export const REWARD_MAX = 500;

const DEFAULT_SMALL = 10;
const DEFAULT_BIG = 30;

/** Legacy persisted settings may still carry defaultTaskReward. */
export type StoredSettings = Partial<AppSettings> & {
  defaultTaskReward?: number;
};

export function clampReward(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_SMALL;
  }
  return Math.min(REWARD_MAX, Math.max(REWARD_MIN, Math.round(value)));
}

export function parseRewardInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return null;
  }
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n < REWARD_MIN || n > REWARD_MAX) {
    return null;
  }
  return n;
}

export function normalizeSettings(raw: StoredSettings | undefined): AppSettings {
  const small =
    raw?.smallTaskReward ??
    raw?.defaultTaskReward ??
    DEFAULT_SMALL;

  return {
    smallTaskReward: clampReward(small),
    bigTaskReward: clampReward(raw?.bigTaskReward ?? DEFAULT_BIG),
    soundEnabled: raw?.soundEnabled ?? false,
    diaryCountsAsTask: raw?.diaryCountsAsTask ?? false,
    pinnedWishId: raw?.pinnedWishId ?? null,
  };
}

export function rewardForTaskSize(
  settings: AppSettings,
  size: 'small' | 'big',
): number {
  return size === 'big' ? settings.bigTaskReward : settings.smallTaskReward;
}
