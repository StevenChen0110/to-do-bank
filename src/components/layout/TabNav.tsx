import { LayoutDashboard, ListChecks, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AppTab = 'dashboard' | 'todo' | 'wishes';

const TABS: { id: AppTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: '撲滿', icon: LayoutDashboard },
  { id: 'todo', label: '回顧', icon: ListChecks },
  { id: 'wishes', label: '願望', icon: Sparkles },
];

interface TabNavProps {
  active: AppTab;
  onChange: (tab: AppTab) => void;
}

export function TabNav({ active, onChange }: TabNavProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
      aria-label="主要導覽"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {TABS.map(({ id, label, icon: Icon }) => {
          const selected = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={cn(
                'flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors active:scale-95 active:bg-accent/50',
                selected
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              aria-current={selected ? 'page' : undefined}
            >
              <Icon className={cn('h-5 w-5', selected && 'stroke-[2.5]')} />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
