import { useMemo, useState } from 'react';
import { ChevronDown, Trash2 } from 'lucide-react';
import type { Task } from '@/types';
import { localDateString } from '@/lib/dates';
import { formatCurrency } from '@/lib/format';
import { formatPinnedGoalNarrative, isPinnedWishActive } from '@/lib/pinnedWish';
import { playDepositChime, unlockAudioFromGesture } from '@/lib/sound';
import { useAppStore } from '@/store/useAppStore';
import { useReward } from '@/context/RewardContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TaskItem } from './TaskItem';
import { cn } from '@/lib/utils';

/** Missed past habit instances, grouped per habit; batch catch-up. Collapsible. */
export function HabitBacklogRail() {
  const todayKey = localDateString();
  const tasks = useAppStore((s) => s.tasks);
  const settings = useAppStore((s) => s.settings);
  const wishes = useAppStore((s) => s.wishes);
  const pinnedWishId = useAppStore((s) => s.settings.pinnedWishId);
  const completeTask = useAppStore((s) => s.completeTask);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const { showToast } = useReward();

  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, string>>({});

  const backlog = useMemo(() => {
    const missed = tasks.filter(
      (t) =>
        t.completedAt === null &&
        t.source?.type === 'habit' &&
        t.scheduledDate < todayKey,
    );
    const byHabit = new Map<string, Task[]>();
    for (const t of missed) {
      const key = t.source!.refId;
      if (!byHabit.has(key)) byHabit.set(key, []);
      byHabit.get(key)!.push(t);
    }
    return [...byHabit.values()].map((list) =>
      [...list].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)),
    );
  }, [tasks, todayKey]);

  if (backlog.length === 0) return null;

  const depositDetail = (): string | undefined => {
    if (!isPinnedWishActive(wishes, pinnedWishId)) return undefined;
    const pinned = wishes.find((w) => w.id === pinnedWishId);
    if (!pinned) return undefined;
    const bal = useAppStore.getState().transactions.reduce((s, tx) => s + tx.amount, 0);
    return formatPinnedGoalNarrative(pinned, bal);
  };

  const completeTimes = (list: Task[], count: number) => {
    const n = Math.min(Math.max(1, count), list.length);
    unlockAudioFromGesture();
    const targets = list.slice(0, n);
    targets.forEach((t) => completeTask(t.id));
    if (settings.soundEnabled) playDepositChime();
    const total = targets.reduce((s, t) => s + t.reward, 0);
    showToast(`補做 ${n} 次 +NT$${total} 已入帳`, 'success', depositDetail());
  };

  const handleComplete = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.completedAt !== null) return;
    unlockAudioFromGesture();
    completeTask(taskId);
    if (settings.soundEnabled) playDepositChime();
    showToast(`+NT$${task.reward} 已入帳`, 'success', depositDetail());
  };

  const totalMissed = backlog.reduce((s, l) => s + l.length, 0);

  return (
    <section className="rounded-xl border border-amber-500/30 bg-amber-50/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold"
      >
        🔁 習慣待辦
        <Badge variant="outline" className="border-amber-500/50 text-amber-600">
          {totalMissed} 次未完成
        </Badge>
        <span className="ml-auto flex items-center gap-1 text-xs font-normal text-muted-foreground">
          補做即入帳
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </span>
      </button>

      {open && (
        <ul className="space-y-2 px-4 pb-4">
          {backlog.map((list) => {
            const oldest = list[0];
            const refId = oldest.source!.refId;
            if (list.length < 3) {
              return list.map((t) => (
                <TaskItem key={t.id} task={t} onDelete={deleteTask} onComplete={handleComplete} />
              ));
            }
            const raw = counts[refId] ?? '1';
            const parsed = Math.min(Math.max(1, Number.parseInt(raw, 10) || 1), list.length);
            return (
              <li key={refId} className="rounded-lg border border-border bg-card px-3 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">{oldest.title}</p>
                  <Badge variant="outline" className="border-amber-500/50 text-amber-600">
                    未完成 ×{list.length}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    +{formatCurrency(oldest.reward)}/次
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="shrink-0 text-xs text-muted-foreground">完成了</span>
                  <Input
                    type="number"
                    min={1}
                    max={list.length}
                    value={raw}
                    onChange={(e) => setCounts((m) => ({ ...m, [refId]: e.target.value }))}
                    className="h-9 w-16 text-center text-sm"
                    aria-label={`${oldest.title} 補做次數`}
                  />
                  <span className="shrink-0 text-xs text-muted-foreground">次</span>
                  <Button
                    type="button"
                    size="sm"
                    className="h-9"
                    onClick={() => {
                      completeTimes(list, parsed);
                      setCounts((m) => ({ ...m, [refId]: '1' }));
                    }}
                  >
                    入帳 +{formatCurrency(oldest.reward * parsed)}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-9 shrink-0 text-muted-foreground"
                    onClick={() => {
                      list.forEach((t) => deleteTask(t.id));
                      showToast(`已清除「${oldest.title}」未完成 ${list.length} 次`, 'info');
                    }}
                    aria-label={`清除 ${oldest.title} 全部未完成`}
                  >
                    <Trash2 className="h-4 w-4" />
                    清除
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
