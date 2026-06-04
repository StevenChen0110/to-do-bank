import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import {
  getWishProgress,
  getWishShortfall,
  getWishStatus,
} from '@/lib/calculations';
import { formatCurrency } from '@/lib/format';
import type { Wish } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface NearestWishCardProps {
  wish: Wish | null;
  balance: number;
  highlightUnlock?: boolean;
  /** When true, card reflects the user-pinned main goal */
  isPinned?: boolean;
}

export function NearestWishCard({
  wish,
  balance,
  highlightUnlock = false,
  isPinned = false,
}: NearestWishCardProps) {
  if (!wish) {
    return (
      <section className="rounded-xl border border-dashed border-border bg-card/50 p-4 text-center text-sm text-muted-foreground">
        尚無願望。到「願望清單」新增第一個目標吧。
      </section>
    );
  }

  const status = getWishStatus(wish, balance);
  const progress = getWishProgress(wish, balance);
  const shortfall = getWishShortfall(wish, balance);
  const unlocked = status === 'available';

  return (
    <motion.section
      layout
      animate={
        highlightUnlock
          ? {
              scale: [1, 1.02, 1],
              boxShadow: [
                '0 0 0 0 rgba(16, 185, 129, 0)',
                '0 0 28px 6px rgba(16, 185, 129, 0.4)',
                '0 0 0 0 rgba(16, 185, 129, 0)',
              ],
            }
          : unlocked
            ? {
                boxShadow: [
                  '0 0 0 0 rgba(16, 185, 129, 0)',
                  '0 0 0 4px rgba(16, 185, 129, 0.2)',
                  '0 0 0 0 rgba(16, 185, 129, 0)',
                ],
              }
            : {}
      }
      transition={{
        duration: highlightUnlock ? 1.2 : 1.5,
        repeat: highlightUnlock ? 0 : unlocked ? Infinity : 0,
        repeatDelay: 2,
      }}
      className={cn(
        'rounded-xl border bg-card p-4 shadow-sm',
        unlocked || highlightUnlock
          ? 'border-emerald-500/60 bg-gradient-to-br from-card to-emerald-50/70'
          : 'border-border',
        highlightUnlock && 'ring-2 ring-emerald-400/40',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold">
          {isPinned ? '主目標' : '最接近解鎖'}
        </h2>
        {unlocked ? (
          <Badge variant="success" className="gap-1">
            <Sparkles className="h-3 w-3" />
            {highlightUnlock ? '剛剛解鎖！' : '可兌換'}
          </Badge>
        ) : (
          <Badge variant="muted">還差 {formatCurrency(shortfall)}</Badge>
        )}
      </div>
      <p className="mt-2 font-medium">{wish.title}</p>
      <Progress
        value={progress * 100}
        className={cn('mt-3', unlocked && '[&>div]:bg-emerald-500')}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        目標 {formatCurrency(wish.cost)}
      </p>
    </motion.section>
  );
}
