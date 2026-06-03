import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { RewardProvider } from '@/context/RewardContext';
import { CoinBurst } from '@/components/effects/CoinBurst';
import { Toaster } from '@/components/effects/Toaster';
import { TabNav, type AppTab } from './TabNav';
import { DashboardPage } from '@/pages/DashboardPage';
import { TodoLogPage } from '@/pages/TodoLogPage';
import { WishlistPage } from '@/pages/WishlistPage';

export function AppShell() {
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

  return (
    <RewardProvider>
      <div className="mx-auto min-h-screen max-w-md bg-background pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
          <h1 className="text-lg font-bold tracking-tight">To Do Bank</h1>
          <p className="text-xs text-muted-foreground">完成待辦，存進撲滿</p>
        </header>

        <main className="px-4 py-4">
          {tab === 'dashboard' && <DashboardPage />}
          {tab === 'todo' && <TodoLogPage />}
          {tab === 'wishes' && <WishlistPage />}
        </main>

        <TabNav active={tab} onChange={setTab} />
        <Toaster />
        <CoinBurst />
      </div>
    </RewardProvider>
  );
}
