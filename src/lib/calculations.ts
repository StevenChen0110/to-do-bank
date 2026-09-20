import { isSameDay, parseISO } from 'date-fns';
import type { Task, Transaction, Wish, WishStatus } from '../types';

export function getCurrentBalance(transactions: Transaction[]): number {
  return transactions.reduce((sum, tx) => sum + tx.amount, 0);
}

/**
 * Cumulative earned = completions net of revokes (uncomplete/delete refunds),
 * excluding wish redemptions (spending your savings isn't "un-earning" it).
 * Netting revokes keeps this stable when a completion is toggled off.
 */
export function getTotalEarned(transactions: Transaction[]): number {
  return transactions
    .filter((tx) => tx.type === 'task_complete' || tx.type === 'task_revoke')
    .reduce((sum, tx) => sum + tx.amount, 0);
}

export function getWishStatus(wish: Wish, balance: number): WishStatus {
  if (wish.redeemedAt !== null) {
    return 'redeemed';
  }
  if (balance >= wish.cost) {
    return 'available';
  }
  return 'locked';
}

export function getWishProgress(wish: Wish, balance: number): number {
  if (wish.redeemedAt !== null) {
    return 1;
  }
  if (wish.cost <= 0) {
    return 1;
  }
  return Math.min(1, Math.max(0, balance / wish.cost));
}

export function getWishShortfall(wish: Wish, balance: number): number {
  if (wish.redeemedAt !== null) {
    return 0;
  }
  return Math.max(0, wish.cost - balance);
}

export function groupTasksByDate(tasks: Task[]): Map<string, Task[]> {
  const groups = new Map<string, Task[]>();
  for (const task of tasks) {
    const key = task.scheduledDate;
    const list = groups.get(key) ?? [];
    list.push(task);
    groups.set(key, list);
  }
  return groups;
}

export function getDailyEarned(
  transactions: Transaction[],
  date: Date,
): number {
  return transactions
    .filter(
      (tx) =>
        (tx.type === 'task_complete' || tx.type === 'task_revoke') &&
        isSameDay(parseISO(tx.createdAt), date),
    )
    .reduce((sum, tx) => sum + tx.amount, 0);
}

/** Average NT$ earned per day over the last `days` days (net of revokes). */
export function getDailyEarnRate(transactions: Transaction[], days = 14): number {
  if (days <= 0) return 0;
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));
  const earned = transactions
    .filter(
      (tx) =>
        (tx.type === 'task_complete' || tx.type === 'task_revoke') &&
        parseISO(tx.createdAt) >= since,
    )
    .reduce((sum, tx) => sum + tx.amount, 0);
  return earned > 0 ? earned / days : 0;
}

/**
 * Estimated whole days until `shortfall` is covered at the recent earning rate.
 * Returns 0 when already affordable, null when the rate is unknown (no recent earning).
 */
export function getDaysToAfford(
  shortfall: number,
  dailyRate: number,
): number | null {
  if (shortfall <= 0) return 0;
  if (dailyRate <= 0) return null;
  return Math.ceil(shortfall / dailyRate);
}

export function findNearestUnlockWish(
  wishes: Wish[],
  balance: number,
): Wish | null {
  const active = wishes.filter((w) => w.redeemedAt === null);
  if (active.length === 0) {
    return null;
  }
  const locked = active
    .filter((w) => balance < w.cost)
    .sort((a, b) => a.cost - b.cost);
  if (locked.length > 0) {
    return locked[0];
  }
  const available = active
    .filter((w) => balance >= w.cost)
    .sort((a, b) => a.cost - b.cost);
  return available[0] ?? null;
}
