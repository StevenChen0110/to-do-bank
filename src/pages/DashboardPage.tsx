import { useMemo } from 'react';
import { addDays, format, parse } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { getDailyEarned } from '@/lib/calculations';
import { localDateString } from '@/lib/dates';
import { TaskPanel } from '@/components/todo/TaskPanel';
import { formatPinnedGoalNarrative, isPinnedWishActive, resolveDashboardWish } from '@/lib/pinnedWish';
import { playDepositChime, unlockAudioFromGesture } from '@/lib/sound';
import { useBalance } from '@/hooks/useBalance';
import { useJustUnlockedWishId } from '@/hooks/useJustUnlockedWishId';
import { useTodayTasks } from '@/hooks/useTodayTasks';
import { useAppStore } from '@/store/useAppStore';
import { useReward } from '@/context/RewardContext';
import { BalanceHero } from '@/components/dashboard/BalanceHero';
import { TodaySnapshot } from '@/components/dashboard/TodaySnapshot';
import { HabitsOverview } from '@/components/dashboard/HabitsOverview';
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
  const deleteTask = useAppStore((s) => s.deleteTask);
  const toggleTaskPin = useAppStore((s) => s.toggleTaskPin);
  const toggleTaskUrgent = useAppStore((s) => s.toggleTaskUrgent);
  const { balance, totalEarned } = useBalance();
  const allTasks = useAppStore((s) => s.tasks);
  const todayTasks = useTodayTasks();
  const upcomingTasks = useMemo(() => {
    const todayKey = localDateString();
    return allTasks
      .filter((t) => t.completedAt === null && t.scheduledDate > todayKey)
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  }, [allTasks]);
  const pinnedTasks = useMemo(
    () =>
      allTasks
        .filter((t) => t.completedAt === null && t.pinned)
        .sort((a, b) => {
          const au = a.priority === 'high' ? 0 : 1;
          const bu = b.priority === 'high' ? 0 : 1;
          if (au !== bu) return au - bu;
          return a.scheduledDate.localeCompare(b.scheduledDate);
        }),
    [allTasks],
  );

  const dateChip = (dk: string): string => {
    const todayKey = localDateString();
    if (dk === todayKey) return '今日';
    const base = parse(todayKey, 'yyyy-MM-dd', new Date());
    if (dk === localDateString(addDays(base, 1))) return '明天';
    if (dk === localDateString(addDays(base, -1))) return '昨天';
    const label = format(parse(dk, 'yyyy-MM-dd', new Date()), 'M/d EEE', { locale: zhTW });
    return dk < todayKey ? `逾期 ${label}` : label;
  };
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
      <TaskPanel
        tasks={pinnedTasks}
        onComplete={handleComplete}
        onDelete={deleteTask}
        onTogglePin={toggleTaskPin}
        onToggleUrgent={toggleTaskUrgent}
        dateLabel={dateChip}
      />
      <BalanceHero balance={balance} totalEarned={totalEarned} />
      <NearestWishCard
        wish={dashboardWish}
        balance={balance}
        isPinned={isPinned}
        highlightUnlock={dashboardWish !== null && dashboardWish.id === justUnlockedId}
      />
      <TodaySnapshot
        tasks={todayTasks}
        upcomingTasks={upcomingTasks}
        dailyEarned={dailyEarned}
        onComplete={handleComplete}
        onNavigate={() => onNavigate('todo')}
      />
      <HabitsOverview onNavigate={() => onNavigate('growth')} />
    </div>
  );
}
