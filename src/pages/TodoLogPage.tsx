import { getDailyEarned } from '@/lib/calculations';
import { formatCurrency } from '@/lib/format';
import { useAppStore } from '@/store/useAppStore';
import { useTodayTasks } from '@/hooks/useTodayTasks';
import { useReward } from '@/context/RewardContext';
import { QuickAddInput } from '@/components/todo/QuickAddInput';
import { TaskList } from '@/components/todo/TaskList';

export function TodoLogPage() {
  const tasks = useAppStore((s) => s.tasks);
  const revokeTask = useAppStore((s) => s.revokeTask);
  const transactions = useAppStore((s) => s.transactions);
  const defaultReward = useAppStore((s) => s.settings.defaultTaskReward);
  const { showToast } = useReward();
  const todayTasks = useTodayTasks();
  const dailyEarned = getDailyEarned(transactions, new Date());
  const completedCount = todayTasks.filter((t) => t.completedAt !== null).length;

  const handleRevoke = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    revokeTask(taskId);
    if (task) {
      showToast(`已撤銷，NT$${task.reward} 已退回`, 'info');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <section>
        <h2 className="mb-2 text-sm font-semibold">今日成就記錄</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          輸入標題後按 Enter，立即完成並入帳 +{defaultReward} 元
        </p>
        <QuickAddInput />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">今日列表</h2>
        <TaskList tasks={todayTasks} onRevoke={handleRevoke} />
      </section>

      <section className="rounded-xl border border-border bg-muted/50 p-4 text-sm">
        <p>
          今日完成 <span className="font-semibold">{completedCount}</span> 筆
        </p>
        <p className="mt-1 text-muted-foreground">
          今日入帳{' '}
          <span className="font-semibold text-primary">
            {formatCurrency(dailyEarned)}
          </span>
        </p>
      </section>
    </div>
  );
}
