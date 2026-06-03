import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Plus } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import {
  burstOriginFromElement,
  useReward,
} from '@/context/RewardContext';
import type { TaskCategory } from '@/types';
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
  const { triggerReward, showToast } = useReward();

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    logCompletedTask(trimmed, category);
    const origin = burstOriginFromElement(formRef.current);
    triggerReward(defaultReward, origin);
    showToast(`+NT$${defaultReward} 已入帳`, 'success');
    setTitle('');
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
              onClick={() => setCategory(id)}
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
