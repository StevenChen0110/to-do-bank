import { useMemo } from 'react';
import { ChevronRight, ShoppingBag, Sparkles } from 'lucide-react';
import {
  findNearestUnlockWish,
  getDailyEarnRate,
  getDaysToAfford,
  getWishProgress,
  getWishShortfall,
} from '@/lib/calculations';
import { formatCurrency } from '@/lib/format';
import { useBalance } from '@/hooks/useBalance';
import { useAppStore } from '@/store/useAppStore';
import { Progress } from '@/components/ui/progress';
import { WishThumb } from '@/components/wish/WishThumb';

interface ShopTeaserProps {
  onNavigate: () => void;
}

/** Home-page shop pull: wallet + what you can buy now / nearest reward. */
export function ShopTeaser({ onNavigate }: ShopTeaserProps) {
  const wishes = useAppStore((s) => s.wishes);
  const transactions = useAppStore((s) => s.transactions);
  const { balance } = useBalance();

  // Memoized so this home-page card doesn't re-scan wishes / the growing
  // transaction log on every unrelated dashboard re-render.
  const { active, affordable, nearest } = useMemo(() => {
    const act = wishes.filter((w) => w.redeemedAt === null);
    return {
      active: act,
      affordable: act
        .filter((w) => balance >= w.cost)
        .sort((a, b) => b.cost - a.cost),
      nearest: findNearestUnlockWish(wishes, balance),
    };
  }, [wishes, balance]);
  const dailyRate = useMemo(() => getDailyEarnRate(transactions), [transactions]);

  return (
    <section className="overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-card">
      <button
        type="button"
        onClick={onNavigate}
        className="flex w-full items-center justify-between gap-2 px-4 pt-3.5 pb-2 text-left"
      >
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <ShoppingBag className="h-4 w-4 text-primary" />
          商店
        </span>
        <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <span className="text-muted-foreground/80">錢包</span>
          <span className="text-sm font-bold text-foreground">
            {formatCurrency(balance)}
          </span>
          <ChevronRight className="h-4 w-4" />
        </span>
      </button>

      <div className="px-4 pb-4">
        {active.length === 0 ? (
          <button
            type="button"
            onClick={onNavigate}
            className="w-full rounded-xl border border-dashed border-primary/30 bg-card/50 px-4 py-4 text-center text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            擺上你想要的東西，完成待辦就能存錢帶回家 🛍️
          </button>
        ) : affordable.length > 0 ? (
          <button
            type="button"
            onClick={onNavigate}
            className="w-full rounded-xl border border-emerald-500/40 bg-emerald-50/60 p-3 text-left transition-colors hover:bg-emerald-50 dark:bg-emerald-950/20"
          >
            <p className="flex items-center gap-1 text-sm font-semibold text-emerald-600">
              <Sparkles className="h-4 w-4" />
              有 {affordable.length} 樣買得起了！
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {affordable.slice(0, 4).map((w) => (
                <span
                  key={w.id}
                  className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-card py-1 pl-1.5 pr-2.5 text-xs font-medium"
                >
                  <WishThumb
                    title={w.title}
                    imageUrl={w.imageUrl}
                    className="h-4 w-4 rounded-full"
                    emojiClassName="text-base"
                  />
                  {w.title}
                </span>
              ))}
              {affordable.length > 4 && (
                <span className="self-center text-xs text-muted-foreground">
                  +{affordable.length - 4}
                </span>
              )}
            </div>
            <p className="mt-2 text-xs font-medium text-emerald-600">去商店結帳 →</p>
          </button>
        ) : nearest ? (
          <NearestRow
            wish={nearest}
            progress={getWishProgress(nearest, balance)}
            shortfall={getWishShortfall(nearest, balance)}
            dailyRate={dailyRate}
            onNavigate={onNavigate}
          />
        ) : null}
      </div>
    </section>
  );
}

function NearestRow({
  wish,
  progress,
  shortfall,
  dailyRate,
  onNavigate,
}: {
  wish: { title: string; imageUrl?: string };
  progress: number;
  shortfall: number;
  dailyRate: number;
  onNavigate: () => void;
}) {
  const days = getDaysToAfford(shortfall, dailyRate);
  return (
    <button
      type="button"
      onClick={onNavigate}
      className="w-full rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40"
    >
      <div className="flex items-center gap-2.5">
        <WishThumb
          title={wish.title}
          imageUrl={wish.imageUrl}
          className="h-10 w-10 shrink-0 rounded-lg"
          emojiClassName="bg-muted text-xl"
        />
        <div className="min-w-0 flex-1">
          <p className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium">{wish.title}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {Math.round(progress * 100)}%
            </span>
          </p>
          <Progress value={progress * 100} className="mt-1.5" />
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        差 {formatCurrency(shortfall)} 就能入手
        {days != null && days > 0 && (
          <span className="text-primary"> · 照這速度約 {days} 天</span>
        )}
      </p>
    </button>
  );
}
