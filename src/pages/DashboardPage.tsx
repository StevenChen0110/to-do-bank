import { getDailyEarned } from '@/lib/calculations';
import { resolveDashboardWish } from '@/lib/pinnedWish';
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
  const pinnedWishId = useAppStore((s) => s.settings.pinnedWishId);
  const { balance, totalEarned } = useBalance();
  const todayTasks = useTodayTasks();
  const dailyEarned = getDailyEarned(transactions, new Date());
  const { wish: dashboardWish, isPinned } = resolveDashboardWish(
    wishes,
    balance,
    pinnedWishId,
  );
  const justUnlockedId = useJustUnlockedWishId(wishes, balance);

  return (
    <div className="flex flex-col gap-4">
      <BalanceHero balance={balance} totalEarned={totalEarned} />
      <TodaySnapshot tasks={todayTasks} dailyEarned={dailyEarned} />
      <NearestWishCard
        wish={dashboardWish}
        balance={balance}
        isPinned={isPinned}
        highlightUnlock={
          dashboardWish !== null && dashboardWish.id === justUnlockedId
        }
      />
    </div>
  );
}
