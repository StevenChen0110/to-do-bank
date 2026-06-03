import { useEffect, useRef, useState } from 'react';
import { getWishStatus } from '@/lib/calculations';
import type { Wish, WishStatus } from '@/types';

/** Returns wish id that just transitioned locked → available (clears after delay). */
export function useJustUnlockedWishId(
  wishes: Wish[],
  balance: number,
  clearMs = 4000,
): string | null {
  const prevStatus = useRef<Map<string, WishStatus>>(new Map());
  const [pulseId, setPulseId] = useState<string | null>(null);

  useEffect(() => {
    let unlockedId: string | null = null;

    for (const wish of wishes) {
      const status = getWishStatus(wish, balance);
      const was = prevStatus.current.get(wish.id);
      if (was === 'locked' && status === 'available') {
        unlockedId = wish.id;
      }
      prevStatus.current.set(wish.id, status);
    }

    if (unlockedId) {
      // Edge-detect unlock; brief highlight state is intentional UX feedback
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot pulse on balance crossing threshold
      setPulseId(unlockedId);
      const timer = window.setTimeout(() => setPulseId(null), clearMs);
      return () => window.clearTimeout(timer);
    }
  }, [wishes, balance, clearMs]);

  return pulseId;
}
