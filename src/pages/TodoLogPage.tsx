import { useMemo, useState } from 'react';
import { format, parse, isToday } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { getDailyEarned } from '@/lib/calculations';
import { localDateString } from '@/lib/dates';
import { formatCurrency } from '@/lib/format';
import {
  formatPinnedGoalNarrative,
  isPinnedWishActive,
} from '@/lib/pinnedWish';
import { playDepositChime, unlockAudioFromGesture } from '@/lib/sound';
import { useAppStore } from '@/store/useAppStore';
import { useTasksForDay } from '@/hooks/useTasksForDay';
import { useReward } from '@/context/RewardContext';
import { QuickAddInput } from '@/components/todo/QuickAddInput';
import { JournalSection } from '@/components/todo/JournalSection';
import { TaskList } from '@/components/todo/TaskList';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function TodoLogPage() {
  const todayKey = localDateString();
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);

  const tasks = useAppStore((s) => s.tasks);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const completeTask = useAppStore((s) => s.completeTask);
  const transactions = useAppStore((s) => s.transactions);
  const settings = useAppStore((s) => s.settings);
  const wishes = useAppStore((s) => s.wishes);
  const pinnedWishId = useAppStore((s) => s.settings.pinnedWishId);
  const { showToast } = useReward();

  const dayTasks = useTasksForDay(selectedDateKey);
  const selectedDay = useMemo(
    () => parse(selectedDateKey, 'yyyy-MM-dd', new Date()),
    [selectedDateKey],
  );
  const dailyEarned = getDailyEarned(transactions, selectedDay);
  const completedCount = dayTasks.filter((t) => t.completedAt !== null).length;
  const pendingCount = dayTasks.filter((t) => t.completedAt === null).length;
  const viewingToday = selectedDateKey === todayKey;

  const dateHeading = format(selectedDay, 'M月d日 EEEE', { locale: zhTW });
  const isSelectedToday = isToday(selectedDay);
  const dayLabel = isSelectedToday ? '今日' : dateHeading;

  const handleComplete = (taskId: string) => {
    unlockAudioFromGesture();
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.completedAt !== null) return;

    completeTask(taskId);

    if (settings.soundEnabled) playDepositChime();

    let detail: string | undefined;
    if (isPinnedWishActive(wishes, pinnedWishId)) {
      const pinned = wishes.find((w) => w.id === pinnedWishId);
      if (pinned) {
        const balanceAfter =
          useAppStore.getState().transactions.reduce((s, tx) => s + tx.amount, 0);
        detail = formatPinnedGoalNarrative(pinned, balanceAfter);
      }
    }
    showToast(`+NT$${task.reward} 已入帳`, 'success', detail);
  };

  const handleDelete = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    const wasCredited = task?.completedAt != null;
    deleteTask(taskId);
    if (!task) return;
    if (wasCredited) {
      showToast('已刪除', 'info', `NT$${task.reward} 已從撲滿退回`);
    } else {
      showToast('已刪除', 'info');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-sm font-semibold">日期</h2>
          {!viewingToday && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setSelectedDateKey(todayKey)}
            >
              回到今天
            </Button>
          )}
        </div>
        <Input
          type="date"
          value={selectedDateKey}
          max={todayKey}
          onChange={(e) => setSelectedDateKey(e.target.value || todayKey)}
          className="min-h-10"
          aria-label="選擇要查看的日期"
        />
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-base font-semibold">{dayLabel}回顧</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {viewingToday
            ? '新增今日待辦，打勾完成後自動入帳；日記成就歸於當日。'
            : '查看並記錄這一天完成的事；日記與成就皆歸於上方所選日期。'}
        </p>

        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold">
            {viewingToday ? '新增待辦' : '補記完成事項'}
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            小任務 +{settings.smallTaskReward} 元、大任務 +{settings.bigTaskReward}{' '}
            元
          </p>
          <QuickAddInput scheduledDate={selectedDateKey} />
        </div>

        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold">{dayLabel}列表</h3>
          <TaskList
            tasks={dayTasks}
            onDelete={handleDelete}
            onComplete={handleComplete}
            emptyMessage={
              isSelectedToday
                ? '今日尚無待辦。在上方輸入事項開始吧。'
                : '此日期尚無記錄。'
            }
          />
        </div>

        <div className="mt-4 rounded-lg bg-muted/50 px-3 py-2.5 text-sm">
          {pendingCount > 0 && (
            <p className="text-muted-foreground">
              待完成 <span className="font-semibold text-foreground">{pendingCount}</span> 筆
            </p>
          )}
          <p className={pendingCount > 0 ? 'mt-1' : ''}>
            {dayLabel}完成{' '}
            <span className="font-semibold">{completedCount}</span> 筆
          </p>
          <p className="mt-1 text-muted-foreground">
            當日入帳{' '}
            <span className="font-semibold text-primary">
              {formatCurrency(dailyEarned)}
            </span>
          </p>
        </div>

        <div className="mt-4">
          <JournalSection dateKey={selectedDateKey} />
        </div>
      </section>
    </div>
  );
}
