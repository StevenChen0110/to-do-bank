import { useState, type KeyboardEvent } from 'react';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface WorkQuickAddProps {
  placeholder?: string;
  /** Capture-only: just a title. No forced category/project/priority/date. */
  onAdd: (title: string) => void;
  className?: string;
}

/** Capture first, organize later — one field, Enter to add. */
export function WorkQuickAdd({ placeholder = '新增工作…', onAdd, className }: WorkQuickAddProps) {
  const [title, setTitle] = useState('');
  const submit = () => {
    const t = title.trim();
    if (!t) return;
    onAdd(t);
    setTitle('');
  };
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        onBlur={submit}
        placeholder={placeholder}
        maxLength={200}
        aria-label="新增工作"
        className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
      />
    </div>
  );
}
