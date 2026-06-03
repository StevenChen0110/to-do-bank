import { AnimatedCounter } from './AnimatedCounter';

interface BalanceHeroProps {
  balance: number;
  totalEarned: number;
}

export function BalanceHero({ balance, totalEarned }: BalanceHeroProps) {
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
    </section>
  );
}
