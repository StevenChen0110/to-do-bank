import { useMemo, useState } from 'react';
import { format, parse, isToday } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { getDailyEarned } from '@/lib/calculations';
import { localDateString } from '@/lib/dates';
import { formatCurrency } from '@/lib/format';
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
  const transactions = useAppStore((s) => s.transactions);
  const settings = useAppStore((s) => s.settings);
  const { showToast } = useReward();
  const dayTasks = useTasksForDay(selectedDateKey);
  const selectedDay = useMemo(
    () => parse(selectedDateKey, 'yyyy-MM-dd', new Date()),
    [selectedDateKey],
  );
  const dailyEarned = getDailyEarned(transactions, selectedDay);
  const completedCount = dayTasks.filter((t) => t.completedAt !== null).length;
  const viewingToday = selectedDateKey === todayKey;

  const dateHeading = format(selectedDay, 'M月d日 EEEE', { locale: zhTW });
  const isSelectedToday = isToday(selectedDay);

  const handleDelete = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    const wasCredited = task?.completedAt != null;
    deleteTask(taskId);
    if (!task) {
      return;
    }
    if (wasCredited) {
      showToast(
        '已刪除',
        'info',
        `NT$${task.reward} 已從撲滿退回`,
      );
    } else {
      showToast('已刪除', 'info');
    }
  };

  const jumpToToday = () => {
    setSelectedDateKey(todayKey);
  };

  const dayLabel = isSelectedToday ? '今日' : dateHeading;

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
              onClick={jumpToToday}
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
          查看並記錄這一天完成的事；日記與成就皆歸於上方所選日期。
        </p>

        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold">完成事項</h3>
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
            emptyMessage={
              isSelectedToday
                ? '今日尚無記錄。在上方輸入完成事項開始累積吧。'
                : '此日期尚無記錄。'
            }
          />
        </div>

        <div className="mt-4 rounded-lg bg-muted/50 px-3 py-2.5 text-sm">
          <p>
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
