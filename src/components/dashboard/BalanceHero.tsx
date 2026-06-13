import { getWishProgress, getWishShortfall, getWishStatus } from '@/lib/calculations';
import { formatCurrency } from '@/lib/format';
import type { Wish } from '@/types';
import { cn } from '@/lib/utils';
import { AnimatedCounter } from './AnimatedCounter';

interface BalanceHeroProps {
  balance: number;
  totalEarned: number;
  wish?: Wish | null;
}

export function BalanceHero({ balance, totalEarned, wish }: BalanceHeroProps) {
  const progress = wish ? getWishProgress(wish, balance) : null;
  const shortfall = wish ? getWishShortfall(wish, balance) : null;
  const unlocked = wish ? getWishStatus(wish, balance) === 'available' : false;
  const pct = progress !== null ? Math.round(progress * 100) : 0;

  return (
    <section className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
      <p className="text-sm text-muted-foreground">撲滿餘額</p>
      <AnimatedCounter
        value={balance}
        className="mt-2 block text-4xl font-bold tracking-tight text-primary"
      />
      <p className="mt-3 text-sm text-muted-foreground">
        累計獲得 NT$ {Math.round(totalEarned).toLocaleString('zh-TW')}
      </p>

      {wish && progress !== null && (
        <div className="mt-4 border-t border-border pt-4 text-left">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="max-w-[70%] truncate text-xs text-muted-foreground">
              目標：{wish.title}
            </span>
            {unlocked ? (
              <span className="text-xs font-semibold text-emerald-500">已達成 🎉</span>
            ) : (
              <span className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{pct}%</span>
                {' · 還差 '}
                <span className="font-semibold text-foreground">{formatCurrency(shortfall!)}</span>
              </span>
            )}
          </div>
          {/* Progress bar */}
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                unlocked ? 'bg-emerald-500' : 'bg-primary',
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
