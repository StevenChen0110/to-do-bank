import { useEffect, useState } from 'react';
import { PiggyBank } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { RewardProvider } from '@/context/RewardContext';
import { Toaster } from '@/components/effects/Toaster';
import { GoalChip } from '@/components/layout/GoalChip';
import { TabNav, TABS, type AppTab } from './TabNav';
import { DashboardPage } from '@/pages/DashboardPage';
import { TodoLogPage } from '@/pages/TodoLogPage';
import { WishlistPage } from '@/pages/WishlistPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { cn } from '@/lib/utils';

function AppShellInner() {
  const hydrate = useAppStore((s) => s.hydrate);
  const hydrated = useAppStore((s) => s._hydrated);
  const [tab, setTab] = useState<AppTab>('dashboard');

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <p className="animate-pulse text-sm">載入撲滿資料中…</p>
      </div>
    );
  }

  const showGoalChip = tab !== 'dashboard';

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-start justify-between gap-4 px-4 py-3 lg:px-6">
          <div className="flex min-w-0 shrink-0 items-start gap-2.5">
            <PiggyBank className="mt-px size-7 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0 pt-px">
              <h1 className="text-xl font-bold leading-tight tracking-tight">To Do Bank</h1>
              <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
                完成待辦，存進撲滿
              </p>
            </div>
          </div>
          {showGoalChip && <GoalChip className="pt-px" />}
        </div>
      </header>

      <div className="mx-auto max-w-5xl lg:flex">
        <aside className="hidden lg:block lg:w-52 lg:shrink-0 lg:border-r lg:border-border">
          <nav className="sticky top-[73px] flex flex-col gap-1 p-3" aria-label="主要導覽">
            {TABS.map(({ id, label, icon: Icon }) => {
              const selected = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    selected
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                  aria-current={selected ? 'page' : undefined}
                >
                  <Icon className={cn('h-4 w-4 shrink-0', selected && 'stroke-[2.5]')} />
                  {label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:px-6 lg:py-6 lg:pb-10">
          <div className="mx-auto max-w-2xl">
            {tab === 'dashboard' && <DashboardPage onNavigate={setTab} />}
            {tab === 'todo' && <TodoLogPage />}
            {tab === 'wishes' && <WishlistPage />}
            {tab === 'settings' && <SettingsPage />}
          </div>
        </main>
      </div>

      <TabNav active={tab} onChange={setTab} />
      <Toaster />
    </div>
  );
}

export function AppShell() {
  return (
    <RewardProvider>
      <AppShellInner />
    </RewardProvider>
  );
}
