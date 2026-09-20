import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionGroupProps {
  label: string;
  /** Optional count badge; omit to show just the label. */
  count?: number;
  defaultOpen?: boolean;
  /** Colour of the count badge. */
  accent?: 'muted' | 'primary' | 'orange';
  children: ReactNode;
}

/** A foldable sub-section with a label + count header. */
export function SectionGroup({
  label,
  count,
  defaultOpen = true,
  accent = 'muted',
  children,
}: SectionGroupProps) {
  const [open, setOpen] = useState(defaultOpen);
  const countColor =
    accent === 'primary'
      ? 'text-primary'
      : accent === 'orange'
        ? 'text-orange-500'
        : 'text-muted-foreground';

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', !open && '-rotate-90')} />
        {label}
        {count !== undefined && (
          <span className={cn('font-semibold', countColor)}>{count}</span>
        )}
      </button>
      {open && <div className="mt-1">{children}</div>}
    </div>
  );
}
