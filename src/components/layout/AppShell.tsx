import { useEffect, useState } from 'react';
import { PiggyBank } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { RewardProvider } from '@/context/RewardContext';
import { Toaster } from '@/components/effects/Toaster';
import { GoalChip } from '@/components/layout/GoalChip';
import { TabNav, type AppTab } from './TabNav';
import { DashboardPage } from '@/pages/DashboardPage';
import { TodoLogPage } from '@/pages/TodoLogPage';
import { WishlistPage } from '@/pages/WishlistPage';
import { SettingsPage } from '@/pages/SettingsPage';

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
    <div className="mx-auto min-h-screen max-w-md bg-background pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 shrink-0 items-start gap-2.5">
            <PiggyBank
              className="mt-px size-7 shrink-0 text-primary"
              aria-hidden
            />
            <div className="min-w-0 pt-px">
              <h1 className="text-xl font-bold leading-tight tracking-tight">
                To Do Bank
              </h1>
              <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
                完成待辦，存進撲滿
              </p>
            </div>
          </div>
          {showGoalChip && <GoalChip className="pt-px" />}
        </div>
      </header>

      <main className="px-4 py-4">
        {tab === 'dashboard' && <DashboardPage />}
        {tab === 'todo' && <TodoLogPage />}
        {tab === 'wishes' && <WishlistPage />}
        {tab === 'settings' && <SettingsPage />}
      </main>

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
