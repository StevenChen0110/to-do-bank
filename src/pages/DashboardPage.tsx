import { findNearestUnlockWish, getDailyEarned } from '@/lib/calculations';
import { useBalance } from '@/hooks/useBalance';
import { useJustUnlockedWishId } from '@/hooks/useJustUnlockedWishId';
import { useTodayTasks } from '@/hooks/useTodayTasks';
import { useAppStore } from '@/store/useAppStore';
import { BalanceHero } from '@/components/dashboard/BalanceHero';
import { TodaySnapshot } from '@/components/dashboard/TodaySnapshot';
import { NearestWishCard } from '@/components/dashboard/NearestWishCard';

export function DashboardPage() {
  const wishes = useAppStore((s) => s.wishes);
  const transactions = useAppStore((s) => s.transactions);
  const { balance, totalEarned } = useBalance();
  const todayTasks = useTodayTasks();
  const dailyEarned = getDailyEarned(transactions, new Date());
  const nearestWish = findNearestUnlockWish(wishes, balance);
  const justUnlockedId = useJustUnlockedWishId(wishes, balance);

  return (
    <div className="flex flex-col gap-4">
      <BalanceHero balance={balance} totalEarned={totalEarned} />
      <TodaySnapshot tasks={todayTasks} dailyEarned={dailyEarned} />
      <NearestWishCard
        wish={nearestWish}
        balance={balance}
        highlightUnlock={
          nearestWish !== null && nearestWish.id === justUnlockedId
        }
      />
    </div>
  );
}
