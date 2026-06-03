import { AnimatePresence, motion } from 'framer-motion';
import { Coins } from 'lucide-react';
import { useReward } from '@/context/RewardContext';

const COIN_OFFSETS = [
  { dx: -36, dy: -52, rotate: -18 },
  { dx: 28, dy: -64, rotate: 12 },
  { dx: -12, dy: -78, rotate: 0 },
  { dx: 44, dy: -48, rotate: 22 },
  { dx: -48, dy: -40, rotate: -8 },
];

export function CoinBurst() {
  const { bursts } = useReward();

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <AnimatePresence>
        {bursts.map((burst) => {
          const left = burst.origin?.x ?? window.innerWidth / 2;
          const top = burst.origin?.y ?? 120;

          return (
            <div
              key={burst.id}
              className="absolute"
              style={{ left, top, transform: 'translate(-50%, -50%)' }}
            >
              {COIN_OFFSETS.map((coin, i) => (
                <motion.span
                  key={`${burst.id}-coin-${i}`}
                  initial={{ opacity: 0, scale: 0.3, x: 0, y: 0 }}
                  animate={{
                    opacity: [0, 1, 1, 0],
                    scale: [0.3, 1, 0.85, 0.5],
                    x: coin.dx,
                    y: coin.dy,
                    rotate: coin.rotate,
                  }}
                  transition={{ duration: 0.85, ease: 'easeOut', delay: i * 0.04 }}
                  className="absolute flex h-7 w-7 items-center justify-center rounded-full bg-amber-300 text-amber-950 shadow-md"
                >
                  <Coins className="h-3.5 w-3.5" aria-hidden />
                </motion.span>
              ))}

              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.6 }}
                animate={{ opacity: [0, 1, 1, 0], y: -56, scale: [0.6, 1.15, 1, 0.9] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="relative z-10 whitespace-nowrap rounded-full border-2 border-amber-500/60 bg-gradient-to-b from-amber-300 to-amber-500 px-5 py-2 text-xl font-bold text-amber-950 shadow-lg shadow-amber-500/30"
              >
                +NT${burst.amount}
              </motion.div>
            </div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
