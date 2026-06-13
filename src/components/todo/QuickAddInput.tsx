import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Plus } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useReward } from '@/context/RewardContext';
import type { TaskCategory, TaskSize } from '@/types';
import {
  formatTitleWithCategoryPrefix,
  stripCategoryPrefix,
} from '@/lib/categoryPrefix';
import { getCurrentBalance } from '@/lib/calculations';
import {
  formatPinnedGoalNarrative,
  isPinnedWishActive,
} from '@/lib/pinnedWish';
import { rewardForTaskSize } from '@/lib/settings';
import { localDateString } from '@/lib/dates';
import { playDepositChime, unlockAudioFromGesture } from '@/lib/sound';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const QUICK_CATEGORIES: { id: TaskCategory; label: string }[] = [
  { id: 'work', label: '工作' },
  { id: 'life', label: '生活' },
  { id: 'health', label: '運動' },
  { id: 'study', label: '學習' },
];

interface QuickAddInputProps {
  scheduledDate: string;
}

export function QuickAddInput({ scheduledDate }: QuickAddInputProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('other');
  const [taskSize, setTaskSize] = useState<TaskSize>('small');
  const addPendingTask = useAppStore((s) => s.addPendingTask);
  const logCompletedTask = useAppStore((s) => s.logCompletedTask);
  const settings = useAppStore((s) => s.settings);
  const wishes = useAppStore((s) => s.wishes);
  const pinnedWishId = useAppStore((s) => s.settings.pinnedWishId);
  const { showToast } = useReward();

  const isToday = scheduledDate === localDateString();
  const reward = rewardForTaskSize(settings, taskSize);

  const selectCategory = (id: TaskCategory) => {
    setCategory(id);
    setTitle((prev) => formatTitleWithCategoryPrefix(prev, id));
  };

  const submit = () => {
    unlockAudioFromGesture();
    const trimmed = stripCategoryPrefix(title.trim());
    if (!trimmed) return;

    if (isToday) {
      addPendingTask(trimmed, category, scheduledDate, { taskSize });
      showToast('已新增待辦', 'success', `打勾後 +NT$${reward} 入帳`);
    } else {
      logCompletedTask(trimmed, category, scheduledDate, { taskSize });

      if (settings.soundEnabled) playDepositChime();

      let detail: string | undefined;
      if (isPinnedWishActive(wishes, pinnedWishId)) {
        const pinned = wishes.find((w) => w.id === pinnedWishId);
        if (pinned) {
          const balanceAfter = getCurrentBalance(
            useAppStore.getState().transactions,
          );
          detail = formatPinnedGoalNarrative(pinned, balanceAfter);
        }
      }
      showToast(`+NT$${reward} 已入帳`, 'success', detail);
    }

    setTitle('');
    setCategory('other');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="flex gap-2" role="group" aria-label="任務大小">
        {(
          [
            { id: 'small' as const, label: '小任務' },
            { id: 'big' as const, label: '大任務' },
          ] as const
        ).map(({ id, label }) => {
          const selected = taskSize === id;
          const amount = rewardForTaskSize(settings, id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTaskSize(id)}
              className={cn(
                'min-h-10 flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors active:scale-95',
                selected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground',
              )}
              aria-pressed={selected}
            >
              {label}
              <span className="mt-0.5 block text-[10px] opacity-80">
                +{amount} 元
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="任務分類">
        {QUICK_CATEGORIES.map(({ id, label }) => {
          const selected = category === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => selectCategory(id)}
              className={cn(
                'min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors active:scale-95',
                selected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
              aria-pressed={selected}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={isToday ? '輸入待辦事項' : '輸入完成的事'}
          maxLength={200}
          aria-label="新增事項"
          className="min-h-11 flex-1"
        />
        <Button
          type="submit"
          size="icon"
          className="h-11 w-11 shrink-0"
          aria-label={isToday ? '新增待辦' : '完成並入帳'}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
