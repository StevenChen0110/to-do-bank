import { lazy, Suspense, useEffect, useState } from 'react';
import { PanelRight, PiggyBank, Settings } from 'lucide-react';
import { isExtPopup, openSidePanel } from '@/lib/runtime';
import { useAppStore } from '@/store/useAppStore';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { RewardProvider } from '@/context/RewardContext';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { Toaster } from '@/components/effects/Toaster';
import { GoalChip } from '@/components/layout/GoalChip';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { TabNav, TABS, type AppTab } from './TabNav';

const VALID_TABS = new Set<string>(TABS.map((t) => t.id));

/** Honour PWA manifest shortcuts (/?tab=work) on cold launch. */
function initialTab(): AppTab {
  if (typeof window === 'undefined') return 'jarvis';
  const want = new URLSearchParams(window.location.search).get('tab');
  return want && VALID_TABS.has(want) ? (want as AppTab) : 'jarvis';
}
// Pages are code-split so each tab loads on demand — the initial JARVIS
// landing stays light instead of pulling in dnd-kit / framer-motion / radix.
const JarvisPage = lazy(() =>
  import('@/pages/JarvisPage').then((m) => ({ default: m.JarvisPage })),
);
const WorkPage = lazy(() =>
  import('@/pages/WorkPage').then((m) => ({ default: m.WorkPage })),
);
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const TodoLogPage = lazy(() =>
  import('@/pages/TodoLogPage').then((m) => ({ default: m.TodoLogPage })),
);
const JournalPage = lazy(() =>
  import('@/pages/JournalPage').then((m) => ({ default: m.JournalPage })),
);
const GrowthPage = lazy(() =>
  import('@/pages/GrowthPage').then((m) => ({ default: m.GrowthPage })),
);
const WishlistPage = lazy(() =>
  import('@/pages/WishlistPage').then((m) => ({ default: m.WishlistPage })),
);
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
import { localDateString } from '@/lib/dates';
import { cn } from '@/lib/utils';

function AppShellInner() {
  const hydrate = useAppStore((s) => s.hydrate);
  const hydrated = useAppStore((s) => s._hydrated);
  const materializeHabitTasks = useAppStore((s) => s.materializeHabitTasks);
  const { ready, user, storageKey } = useAuth();
  const [tab, setTab] = useState<AppTab>(initialTab);

  // Re-hydrate whenever the canonical storage key changes (login / link).
  useEffect(() => {
    if (ready && user && storageKey) void hydrate();
  }, [ready, user, storageKey, hydrate]);

  // After data is loaded, lazily create today's habit task instances.
  useEffect(() => {
    if (hydrated) materializeHabitTasks(localDateString());
  }, [hydrated, materializeHabitTasks]);

  // Re-pull from the cloud when the tab regains focus, so edits made on LINE
  // (or another device) show up without a manual reload. Throttled.
  useEffect(() => {
    if (!ready || !user || !storageKey) return;
    let last = Date.now();
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - last < 1500) return;
      last = Date.now();
      void hydrate().then(() => materializeHabitTasks(localDateString()));
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [ready, user, storageKey, hydrate, materializeHabitTasks]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <p className="animate-pulse text-sm">載入中…</p>
      </div>
    );
  }

  if (!user) return <LoginScreen />;

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
        <OfflineBanner />
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
          <div className="flex shrink-0 items-center gap-2 pt-px">
            {showGoalChip && <GoalChip />}
            {isExtPopup && (
              <button
                type="button"
                onClick={() => void openSidePanel()}
                aria-label="在側邊欄開啟"
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <PanelRight className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setTab('settings')}
              aria-label="設定"
              aria-current={tab === 'settings' ? 'page' : undefined}
              className={cn(
                'rounded-lg p-2 transition-colors',
                tab === 'settings'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
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
          <div className={cn('mx-auto', tab === 'work' ? 'max-w-4xl' : 'max-w-2xl')}>
            <Suspense
              fallback={
                <div className="flex justify-center py-16 text-sm text-muted-foreground">
                  <span className="animate-pulse">載入中…</span>
                </div>
              }
            >
              {tab === 'jarvis' && <JarvisPage />}
              {tab === 'work' && <WorkPage />}
              {tab === 'dashboard' && <DashboardPage onNavigate={setTab} />}
              {tab === 'todo' && <TodoLogPage />}
              {tab === 'journal' && <JournalPage />}
              {tab === 'wishes' && <WishlistPage />}
              {tab === 'growth' && <GrowthPage />}
              {tab === 'settings' && <SettingsPage />}
            </Suspense>
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
    <AuthProvider>
      <RewardProvider>
        <AppShellInner />
      </RewardProvider>
    </AuthProvider>
  );
}
