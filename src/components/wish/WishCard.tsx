import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Gift, Pin, Trash2 } from 'lucide-react';
import {
  getWishProgress,
  getWishShortfall,
  getWishStatus,
} from '@/lib/calculations';
import { formatCurrency } from '@/lib/format';
import type { Wish, WishStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<WishStatus, string> = {
  locked: '累積中',
  available: '可兌換',
  redeemed: '已兌換',
};

interface WishCardProps {
  wish: Wish;
  balance: number;
  isPinned: boolean;
  onRedeem: (wish: Wish) => void;
  onDelete: (wishId: string) => void;
  onTogglePin: (wishId: string) => void;
}

export function WishCard({
  wish,
  balance,
  isPinned,
  onRedeem,
  onDelete,
  onTogglePin,
}: WishCardProps) {
  const status = getWishStatus(wish, balance);
  const progress = getWishProgress(wish, balance);
  const shortfall = getWishShortfall(wish, balance);
  const prevStatus = useRef(status);
  const [justUnlocked, setJustUnlocked] = useState(false);

  useEffect(() => {
    if (prevStatus.current === 'locked' && status === 'available') {
      setJustUnlocked(true);
      const timer = window.setTimeout(() => setJustUnlocked(false), 900);
      prevStatus.current = status;
      return () => window.clearTimeout(timer);
    }
    prevStatus.current = status;
  }, [status]);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={
        justUnlocked
          ? {
              opacity: 1,
              y: 0,
              scale: [1, 1.03, 1],
              boxShadow: [
                '0 0 0 0 rgba(16, 185, 129, 0)',
                '0 0 24px 4px rgba(16, 185, 129, 0.35)',
                '0 0 0 0 rgba(16, 185, 129, 0)',
              ],
            }
          : { opacity: 1, y: 0 }
      }
      transition={
        justUnlocked
          ? { duration: 0.9, ease: 'easeOut' }
          : { duration: 0.25 }
      }
      className={cn(
        'rounded-xl border p-4 shadow-sm transition-colors',
        status === 'locked' && 'border-border bg-muted/30 opacity-95',
        status === 'available' &&
          'border-emerald-500/50 bg-gradient-to-br from-card to-emerald-50/80 ring-2 ring-emerald-400/25 dark:to-emerald-950/20',
        status === 'redeemed' &&
          'border-border/60 bg-muted/20 opacity-60 saturate-50',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3
            className={cn(
              'font-medium',
              status === 'redeemed' && 'text-muted-foreground line-through',
            )}
          >
            {wish.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            目標 {formatCurrency(wish.cost)}
          </p>
        </div>
        <Badge
          variant={
            status === 'available'
              ? 'success'
              : status === 'redeemed'
                ? 'muted'
                : 'secondary'
          }
        >
          {STATUS_LABELS[status]}
        </Badge>
      </div>

      {status !== 'redeemed' && (
        <>
          <Progress
            value={progress * 100}
            className={cn(
              'mt-3',
              status === 'available' && '[&>div]:bg-emerald-500',
            )}
          />
          {status === 'locked' && (
            <p className="mt-2 text-xs text-muted-foreground">
              還差 {formatCurrency(shortfall)}
            </p>
          )}
        </>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {status !== 'redeemed' && (
          <Button
            type="button"
            variant={isPinned ? 'default' : 'outline'}
            className="min-h-11 flex-1"
            onClick={() => onTogglePin(wish.id)}
            aria-pressed={isPinned}
          >
            <Pin className={cn('h-4 w-4', isPinned && 'fill-current')} />
            {isPinned ? '已釘選主目標' : '設為主目標'}
          </Button>
        )}
        {status === 'available' && (
          <Button
            type="button"
            className="min-h-11 flex-1"
            onClick={() => onRedeem(wish)}
          >
            <Gift className="h-4 w-4" />
            兌換
          </Button>
        )}
        {status !== 'redeemed' && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0"
            onClick={() => onDelete(wish.id)}
            aria-label="刪除願望"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </motion.article>
  );
}
