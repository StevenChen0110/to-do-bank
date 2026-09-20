import { motion } from 'framer-motion';
import { ExternalLink, Pin, ShoppingCart, Trash2 } from 'lucide-react';
import {
  getDaysToAfford,
  getWishProgress,
  getWishShortfall,
} from '@/lib/calculations';
import { formatCurrency } from '@/lib/format';
import type { Wish } from '@/types';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { WishThumb } from './WishThumb';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  wish: Wish;
  balance: number;
  /** Recent NT$/day earning rate, for the ETA line. */
  dailyRate: number;
  isPinned: boolean;
  onBuy: (wish: Wish) => void;
  onDelete: (wishId: string) => void;
  onTogglePin: (wishId: string) => void;
}

/** A wish rendered as a shop product: price tag, buy button, or shortfall + ETA. */
export function ProductCard({
  wish,
  balance,
  dailyRate,
  isPinned,
  onBuy,
  onDelete,
  onTogglePin,
}: ProductCardProps) {
  const affordable = balance >= wish.cost;
  const progress = getWishProgress(wish, balance);
  const shortfall = getWishShortfall(wish, balance);
  const days = getDaysToAfford(shortfall, dailyRate);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'flex flex-col rounded-2xl border p-3 shadow-sm transition-colors',
        affordable
          ? 'border-emerald-500/50 bg-gradient-to-br from-card to-emerald-50/70 ring-1 ring-emerald-400/25 dark:to-emerald-950/20'
          : 'border-border bg-card',
      )}
    >
      <div className="flex items-start gap-2">
        <WishThumb
          title={wish.title}
          imageUrl={wish.imageUrl}
          className="h-14 w-14 shrink-0 rounded-xl border border-border"
          emojiClassName={cn('text-2xl', affordable ? 'bg-emerald-500/10' : 'bg-muted')}
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium leading-tight">{wish.title}</h3>
          <p
            className={cn(
              'mt-0.5 text-sm font-semibold',
              affordable ? 'text-emerald-600' : 'text-foreground',
            )}
          >
            {formatCurrency(wish.cost)}
          </p>
          {wish.productUrl && (
            <a
              href={wish.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] text-muted-foreground transition-colors hover:text-primary"
            >
              查看商品
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={() => onTogglePin(wish.id)}
            aria-pressed={isPinned}
            aria-label={isPinned ? '取消主目標' : '設為主目標'}
            className={cn(
              'rounded-md p-1.5 transition-colors',
              isPinned
                ? 'text-primary'
                : 'text-muted-foreground/50 hover:text-primary',
            )}
          >
            <Pin className={cn('h-4 w-4', isPinned && 'fill-current')} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(wish.id)}
            aria-label="刪除願望"
            className="rounded-md p-1.5 text-muted-foreground/50 transition-colors hover:text-foreground"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Progress
        value={progress * 100}
        className={cn('mt-3', affordable && '[&>div]:bg-emerald-500')}
      />

      <p className="mt-1.5 min-h-4 text-xs text-muted-foreground">
        {affordable ? (
          <span className="font-medium text-emerald-600">錢包夠了，可入手 🎉</span>
        ) : (
          <>
            還差 {formatCurrency(shortfall)}
            {days != null && days > 0 && (
              <span className="text-muted-foreground/70"> · 約 {days} 天</span>
            )}
          </>
        )}
      </p>

      <Button
        type="button"
        className="mt-2 min-h-10 w-full"
        variant={affordable ? 'default' : 'outline'}
        disabled={!affordable}
        onClick={() => onBuy(wish)}
      >
        <ShoppingCart className="h-4 w-4" />
        {affordable ? '購買' : '還在存'}
      </Button>
    </motion.article>
  );
}
