import { animate, motion, useAnimation } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
  value: number;
  className?: string;
}

export function AnimatedCounter({ value, className }: AnimatedCounterProps) {
  const [display, setDisplay] = useState(value);
  const prevValue = useRef(value);
  const controls = useAnimation();
  const [flashDebit, setFlashDebit] = useState(false);

  useEffect(() => {
    const isDebit = value < prevValue.current;
    prevValue.current = value;

    const motionControls = animate(display, value, {
      duration: isDebit ? 0.45 : 0.65,
      ease: isDebit ? 'easeInOut' : 'easeOut',
      onUpdate: (v) => setDisplay(v),
    });

    if (isDebit) {
      void controls.start({
        x: [0, -4, 4, -3, 3, 0],
        transition: { duration: 0.4 },
      });
      setFlashDebit(true);
      const flashTimer = window.setTimeout(() => setFlashDebit(false), 500);
      return () => {
        motionControls.stop();
        window.clearTimeout(flashTimer);
      };
    }

    return () => motionControls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animate from last displayed value
  }, [value, controls]);

  return (
    <motion.span
      animate={controls}
      className={cn(
        className,
        'inline-block transition-colors duration-300',
        flashDebit && 'text-destructive',
      )}
    >
      {formatCurrency(Math.round(display))}
    </motion.span>
  );
}
