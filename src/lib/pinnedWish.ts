import {
  findNearestUnlockWish,
  getWishProgress,
  getWishShortfall,
} from './calculations';
import { formatCurrency } from './format';
import type { Wish } from '../types';

export function isPinnedWishActive(
  wishes: Wish[],
  pinnedWishId: string | null,
): boolean {
  if (!pinnedWishId) {
    return false;
  }
  const wish = wishes.find((w) => w.id === pinnedWishId);
  return wish !== undefined && wish.redeemedAt === null;
}

/** 僅回傳有效釘選的主目標（不含「最接近解鎖」fallback） */
export function resolvePinnedWish(
  wishes: Wish[],
  pinnedWishId: string | null,
): Wish | null {
  if (!pinnedWishId) {
    return null;
  }
  const pinned = wishes.find((w) => w.id === pinnedWishId);
  if (pinned && pinned.redeemedAt === null) {
    return pinned;
  }
  return null;
}

export function resolveDashboardWish(
  wishes: Wish[],
  balance: number,
  pinnedWishId: string | null,
): { wish: Wish | null; isPinned: boolean } {
  const pinned = resolvePinnedWish(wishes, pinnedWishId);
  if (pinned) {
    return { wish: pinned, isPinned: true };
  }
  return {
    wish: findNearestUnlockWish(wishes, balance),
    isPinned: false,
  };
}

export function formatPinnedGoalNarrative(
  wish: Wish,
  balance: number,
): string {
  const shortfall = getWishShortfall(wish, balance);
  const percent = Math.round(getWishProgress(wish, balance) * 100);
  return `距離「${wish.title}」還差 ${formatCurrency(shortfall)}（${percent}%）`;
}
