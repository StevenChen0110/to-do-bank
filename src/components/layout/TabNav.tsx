import { LayoutDashboard, ListChecks, Settings, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AppTab = 'dashboard' | 'todo' | 'wishes' | 'settings';

export const TABS: {
  id: AppTab;
  label: string;
  icon: typeof LayoutDashboard;
}[] = [
  { id: 'dashboard', label: '撲滿', icon: LayoutDashboard },
  { id: 'todo', label: '回顧', icon: ListChecks },
  { id: 'wishes', label: '願望', icon: Sparkles },
  { id: 'settings', label: '設定', icon: Settings },
];

interface TabNavProps {
  active: AppTab;
  onChange: (tab: AppTab) => void;
}

export function TabNav({ active, onChange }: TabNavProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:hidden"
      aria-label="主要導覽"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {TABS.map(({ id, label, icon: Icon }) => {
          const selected = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={cn(
                'flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 text-[11px] font-medium transition-colors active:scale-95 active:bg-accent/50',
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
