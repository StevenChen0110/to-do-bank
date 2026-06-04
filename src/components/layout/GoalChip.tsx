import { useAppStore } from '@/store/useAppStore';
import { useBalance } from '@/hooks/useBalance';
import { useReward } from '@/context/RewardContext';
import { getWishProgress } from '@/lib/calculations';
import { formatCurrencyCompact } from '@/lib/format';
import { resolvePinnedWish } from '@/lib/pinnedWish';
import { AnimatedCounter } from '@/components/dashboard/AnimatedCounter';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface GoalChipProps {
  className?: string;
}

/** 非撲滿 Tab 右上角：主目標進度 + NT$餘額 / 進度%（緊湊，與 Logo 同列對齊） */
export function GoalChip({ className }: GoalChipProps) {
  const wishes = useAppStore((s) => s.wishes);
  const pinnedWishId = useAppStore((s) => s.settings.pinnedWishId);
  const { balance } = useBalance();
  const { balanceCreditDelta } = useReward();

  const goalWish = resolvePinnedWish(wishes, pinnedWishId);
  const hasMainGoal = goalWish !== null;

  const progress = goalWish ? getWishProgress(goalWish, balance) : 0;
  const pct = Math.round(progress * 100);

  return (
    <div
      className={cn(
        'flex min-w-0 max-w-[13rem] flex-1 flex-col text-right sm:max-w-[14rem]',
        className,
      )}
      role="region"
      aria-label={
        hasMainGoal
          ? `主目標：${goalWish.title}，餘額 ${formatCurrencyCompact(balance)}，進度 ${pct}%`
          : `主目標：尚未設定，餘額 ${formatCurrencyCompact(balance)}`
      }
    >
      {/* 第一行：標題 */}
      <p className="truncate text-sm font-semibold leading-snug tracking-tight">
        {hasMainGoal ? (
          <>
            <span className="font-medium text-muted-foreground">主目標 · </span>
            {goalWish.title}
          </>
        ) : (
          <span className="text-muted-foreground">還沒設定目標喔！</span>
        )}
      </p>

      {/* 第二行：餘額 / 進度%（+NT$ 浮字綁在此行） */}
      <div className="relative mt-0.5 flex items-baseline justify-end gap-0.5 text-xs font-semibold leading-none tabular-nums">
        <AnimatedCounter
          value={balance}
          variant="compact"
          className="text-primary"
        />
        <span className="text-muted-foreground"> / </span>
        <span className="text-muted-foreground">{pct}%</span>
        {balanceCreditDelta != null && (
          <span
            className="pointer-events-none absolute -top-2.5 right-0 text-[11px] font-bold text-primary hud-float"
            aria-hidden
          >
            +{formatCurrencyCompact(balanceCreditDelta)}
          </span>
        )}
      </div>

      {/* 第三行：進度條 */}
      <Progress value={pct} className="mt-1 h-1.5" />
    </div>
  );
}
