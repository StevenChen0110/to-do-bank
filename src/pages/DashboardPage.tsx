import { getDailyEarned } from '@/lib/calculations';
import { formatPinnedGoalNarrative, isPinnedWishActive, resolveDashboardWish } from '@/lib/pinnedWish';
import { playDepositChime, unlockAudioFromGesture } from '@/lib/sound';
import { useBalance } from '@/hooks/useBalance';
import { useJustUnlockedWishId } from '@/hooks/useJustUnlockedWishId';
import { useTodayTasks } from '@/hooks/useTodayTasks';
import { useAppStore } from '@/store/useAppStore';
import { useReward } from '@/context/RewardContext';
import { BalanceHero } from '@/components/dashboard/BalanceHero';
import { TodaySnapshot } from '@/components/dashboard/TodaySnapshot';
import { NearestWishCard } from '@/components/dashboard/NearestWishCard';
import type { AppTab } from '@/components/layout/TabNav';

interface DashboardPageProps {
  onNavigate: (tab: AppTab) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const wishes = useAppStore((s) => s.wishes);
  const transactions = useAppStore((s) => s.transactions);
  const pinnedWishId = useAppStore((s) => s.settings.pinnedWishId);
  const settings = useAppStore((s) => s.settings);
  const completeTask = useAppStore((s) => s.completeTask);
  const { balance, totalEarned } = useBalance();
  const todayTasks = useTodayTasks();
  const dailyEarned = getDailyEarned(transactions, new Date());
  const { wish: dashboardWish, isPinned } = resolveDashboardWish(wishes, balance, pinnedWishId);
  const justUnlockedId = useJustUnlockedWishId(wishes, balance);
  const { showToast } = useReward();

  const handleComplete = (taskId: string) => {
    unlockAudioFromGesture();
    const task = useAppStore.getState().tasks.find((t) => t.id === taskId);
    if (!task || task.completedAt !== null) return;
    completeTask(taskId);
    if (settings.soundEnabled) playDepositChime();

    let detail: string | undefined;
    if (isPinnedWishActive(wishes, pinnedWishId)) {
      const pinned = wishes.find((w) => w.id === pinnedWishId);
      if (pinned) {
        const bal = useAppStore.getState().transactions.reduce((s, tx) => s + tx.amount, 0);
        detail = formatPinnedGoalNarrative(pinned, bal);
      }
    }
    showToast(`+NT$${task.reward} 已入帳`, 'success', detail);
  };

  return (
    <div className="flex flex-col gap-4">
      <BalanceHero balance={balance} totalEarned={totalEarned} wish={dashboardWish} />
      <TodaySnapshot
        tasks={todayTasks}
        dailyEarned={dailyEarned}
        onComplete={handleComplete}
        onNavigate={() => onNavigate('todo')}
      />
      <NearestWishCard
        wish={dashboardWish}
        balance={balance}
        isPinned={isPinned}
        highlightUnlock={dashboardWish !== null && dashboardWish.id === justUnlockedId}
      />
    </div>
  );
}
