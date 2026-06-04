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

export function resolveDashboardWish(
  wishes: Wish[],
  balance: number,
  pinnedWishId: string | null,
): { wish: Wish | null; isPinned: boolean } {
  if (pinnedWishId) {
    const pinned = wishes.find((w) => w.id === pinnedWishId);
    if (pinned && pinned.redeemedAt === null) {
      return { wish: pinned, isPinned: true };
    }
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
