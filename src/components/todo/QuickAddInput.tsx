import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Plus } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import {
  burstOriginFromElement,
  useReward,
} from '@/context/RewardContext';
import type { TaskCategory } from '@/types';
import {
  formatTitleWithCategoryPrefix,
  stripCategoryPrefix,
} from '@/lib/categoryPrefix';
import { getCurrentBalance } from '@/lib/calculations';
import {
  formatPinnedGoalNarrative,
  isPinnedWishActive,
} from '@/lib/pinnedWish';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const QUICK_CATEGORIES: { id: TaskCategory; label: string }[] = [
  { id: 'work', label: '工作' },
  { id: 'life', label: '生活' },
  { id: 'health', label: '運動' },
  { id: 'study', label: '學習' },
];

export function QuickAddInput() {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('other');
  const formRef = useRef<HTMLFormElement>(null);
  const logCompletedTask = useAppStore((s) => s.logCompletedTask);
  const defaultReward = useAppStore((s) => s.settings.defaultTaskReward);
  const wishes = useAppStore((s) => s.wishes);
  const pinnedWishId = useAppStore((s) => s.settings.pinnedWishId);
  const { triggerReward, showToast } = useReward();

  const selectCategory = (id: TaskCategory) => {
    setCategory(id);
    setTitle((prev) => formatTitleWithCategoryPrefix(prev, id));
  };

  const submit = () => {
    const trimmed = stripCategoryPrefix(title.trim());
    if (!trimmed) {
      return;
    }
    logCompletedTask(trimmed, category);
    const origin = burstOriginFromElement(formRef.current);
    triggerReward(defaultReward, origin);

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

    showToast(`+NT$${defaultReward} 已入帳`, 'success', detail);
    setTitle('');
    setCategory('other');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-3">
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
          placeholder="輸入今天完成的事，按 Enter 入帳"
          maxLength={200}
          aria-label="新增今日成就"
          className="min-h-11 flex-1"
        />
        <Button
          type="submit"
          size="icon"
          className="h-11 w-11 shrink-0"
          aria-label="完成並入帳"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
