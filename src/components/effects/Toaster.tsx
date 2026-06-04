import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info } from 'lucide-react';
import { useReward, type ToastKind } from '@/context/RewardContext';
import { cn } from '@/lib/utils';

const KIND_STYLES: Record<ToastKind, string> = {
  success: 'border-primary/30 bg-card text-foreground',
  info: 'border-border bg-card text-foreground',
  default: 'border-border bg-card text-foreground',
};

function ToastIcon({ kind }: { kind: ToastKind }) {
  if (kind === 'success') {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />;
  }
  return <Info className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />;
}

export function Toaster() {
  const { toasts } = useReward();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]"
      aria-live="polite"
      aria-relevant="additions"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className={cn(
              'flex w-full max-w-sm items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg',
              KIND_STYLES[toast.kind],
            )}
          >
            <ToastIcon kind={toast.kind} />
            <div className="min-w-0 flex-1">
              <p>{toast.message}</p>
              {toast.detail ? (
                <p className="mt-0.5 text-xs font-normal text-muted-foreground">
                  {toast.detail}
                </p>
              ) : null}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
