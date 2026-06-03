import { useMemo } from 'react';
import { getCurrentBalance, getTotalEarned } from '../lib/calculations';
import { useAppStore } from '../store/useAppStore';

export function useBalance() {
  const transactions = useAppStore((s) => s.transactions);

  return useMemo(
    () => ({
      balance: getCurrentBalance(transactions),
      totalEarned: getTotalEarned(transactions),
    }),
    [transactions],
  );
}
