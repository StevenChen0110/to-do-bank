import { animate } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { formatCurrency, formatCurrencyCompact } from '@/lib/format';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
  value: number;
  className?: string;
  /** compact：NT$120（無空格，供 HUD） */
  variant?: 'default' | 'compact';
}

/** Subtle count-up when balance changes; no shake or particle effects. */
export function AnimatedCounter({
  value,
  className,
  variant = 'default',
}: AnimatedCounterProps) {
  const format =
    variant === 'compact' ? formatCurrencyCompact : formatCurrency;
  const [display, setDisplay] = useState(value);
  const prevValue = useRef(value);

  useEffect(() => {
    const from = prevValue.current;
    prevValue.current = value;
    const motionControls = animate(from, value, {
      duration: value >= from ? 0.5 : 0.35,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(v),
    });
    return () => motionControls.stop();
  }, [value]);

  return (
    <span className={cn(className, 'tabular-nums')}>
      {format(Math.round(display))}
    </span>
  );
}
