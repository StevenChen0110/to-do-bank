import { format, isSameDay, parseISO, startOfDay } from 'date-fns';
import type { Task, Transaction, Wish, WishStatus } from '../types';

export function getCurrentBalance(transactions: Transaction[]): number {
  return transactions.reduce((sum, tx) => sum + tx.amount, 0);
}

export function getTotalEarned(transactions: Transaction[]): number {
  return transactions
    .filter((tx) => tx.amount > 0)
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
    const key = format(startOfDay(parseISO(task.scheduledDate)), 'yyyy-MM-dd');
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
