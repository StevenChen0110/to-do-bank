import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { localDateString } from '@/lib/dates';
import type { JarvisItem } from '@/lib/jarvis/types';
import { useAppStore } from '@/store/useAppStore';
import { useJarvisStore } from '@/store/useJarvisStore';
import { useReward } from '@/context/RewardContext';
import { SectionGroup } from '@/components/dashboard/SectionGroup';
import { BriefingItem } from '@/components/jarvis/BriefingItem';
import { FeedItem } from '@/components/jarvis/FeedItem';
import { JarvisProfileEditor } from '@/components/jarvis/JarvisProfileEditor';
import { cn } from '@/lib/utils';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return '深夜好';
  if (h < 11) return '早安';
  if (h < 14) return '午安';
  if (h < 18) return '午後好';
  return '晚安';
}

export function JarvisPage() {
  const items = useJarvisStore((s) => s.items);
  const setStatus = useJarvisStore((s) => s.setStatus);
  const refresh = useJarvisStore((s) => s.refresh);
  const loading = useJarvisStore((s) => s.loading);
  const usingMock = useJarvisStore((s) => s.usingMock);
  const hasFetched = useJarvisStore((s) => s.hasFetched);
  const addPendingTask = useAppStore((s) => s.addPendingTask);
  const profile = useAppStore((s) => s.settings.jarvis);
  const { showToast } = useReward();
  const [feedFilter, setFeedFilter] = useState<'all' | 'saved'>('all');

  // Fetch live intelligence once per session; the button re-fetches on demand.
  useEffect(() => {
    if (!hasFetched) void refresh(profile);
  }, [hasFetched, refresh, profile]);

  const profileEmpty =
    !profile ||
    (profile.interests.length === 0 &&
      profile.watchlist.length === 0 &&
      profile.careerRoles.length === 0 &&
      profile.projects.length === 0);

  const visible = useMemo(
    () =>
      items
        .filter((it) => it.status !== 'dismissed')
        .sort((a, b) => b.relevance - a.relevance),
    [items],
  );
  const top3 = visible.slice(0, 3);
  const rest = visible.slice(3);
  const feed = feedFilter === 'saved' ? rest.filter((it) => it.status === 'saved') : rest;
  const savedCount = visible.filter((it) => it.status === 'saved').length;

  const handleAddTodo = (item: JarvisItem) => {
    const title = item.action?.label ?? item.title;
    const date = item.action?.suggestedDate ?? localDateString();
    const created = addPendingTask(title, 'other', date);
    if (!created) return;
    setStatus(item.id, 'added');
    showToast('已加入待辦', 'success', title);
  };
  const handleSave = (item: JarvisItem) =>
    setStatus(item.id, item.status === 'saved' ? 'new' : 'saved');
  const handleDismiss = (item: JarvisItem) => setStatus(item.id, 'dismissed');

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <header>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">JARVIS</h1>
          <button
            type="button"
            onClick={() => void refresh(profile)}
            disabled={loading}
            aria-label="重新整理"
            className="ml-auto flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            更新
          </button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading
            ? 'JARVIS 正在為你看今天的資訊…'
            : `${greeting()}，我已看過今天的資訊，幫你留下最重要的 ${top3.length} 件。`}
        </p>
      </header>

      {/* Demo-data notice (only until live intelligence loads) */}
      {usingMock && !loading && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-50/40 px-3 py-2 text-[11px] text-amber-700 dark:bg-amber-950/20">
          目前為示範資料（尚未取得即時情報）。設定金鑰並部署後，這裡會換成真正為你篩選的情報。
        </div>
      )}

      {/* 設定關注（未設定時提示） */}
      {profileEmpty && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
          <p className="font-medium text-primary">先告訴 JARVIS 你在乎什麼</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            設定興趣、觀察清單與職涯方向，推薦才會準。展開下方「調整我的關注」即可。
          </p>
        </div>
      )}

      {/* Morning Briefing */}
      <section>
        <h2 className="mb-2 text-sm font-semibold">今天最該知道的 {top3.length} 件事</h2>
        {top3.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            今天沒有需要你特別注意的事，先專注在待辦上吧。
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {top3.map((item) => (
              <BriefingItem
                key={item.id}
                item={item}
                onAddTodo={handleAddTodo}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        )}
      </section>

      {/* 完整情報 Feed */}
      {(rest.length > 0 || savedCount > 0) && (
        <SectionGroup label="完整情報" count={rest.length} defaultOpen={false}>
          <div className="mb-2 flex gap-1.5">
            {(
              [
                { id: 'all', label: '全部' },
                { id: 'saved', label: `已儲存${savedCount > 0 ? ` ${savedCount}` : ''}` },
              ] as const
            ).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setFeedFilter(id)}
                aria-pressed={feedFilter === id}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  feedFilter === id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {feed.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
              {feedFilter === 'saved' ? '還沒有儲存的情報。' : '沒有更多情報了。'}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {feed.map((item) => (
                <FeedItem
                  key={item.id}
                  item={item}
                  onAddTodo={handleAddTodo}
                  onSave={handleSave}
                  onDismiss={handleDismiss}
                />
              ))}
            </ul>
          )}
        </SectionGroup>
      )}

      {/* 調整我的關注 */}
      <SectionGroup label="調整我的關注" defaultOpen={profileEmpty}>
        <JarvisProfileEditor />
      </SectionGroup>
    </div>
  );
}
