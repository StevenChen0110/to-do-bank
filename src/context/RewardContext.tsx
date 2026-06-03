import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export interface BurstOrigin {
  x: number;
  y: number;
}

export interface RewardBurst {
  id: number;
  amount: number;
  origin?: BurstOrigin;
}

export type ToastKind = 'success' | 'info' | 'default';

export interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

interface RewardContextValue {
  bursts: RewardBurst[];
  toasts: ToastItem[];
  triggerReward: (amount: number, origin?: BurstOrigin) => void;
  showToast: (message: string, kind?: ToastKind) => void;
  dismissBurst: (id: number) => void;
  dismissToast: (id: number) => void;
}

const RewardContext = createContext<RewardContextValue | null>(null);

let burstId = 0;
let toastId = 0;

export function RewardProvider({ children }: { children: ReactNode }) {
  const [bursts, setBursts] = useState<RewardBurst[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const triggerReward = useCallback((amount: number, origin?: BurstOrigin) => {
    const id = ++burstId;
    setBursts((prev) => [...prev, { id, amount, origin }]);
    window.setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== id));
    }, 1400);
  }, []);

  const showToast = useCallback((message: string, kind: ToastKind = 'default') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, kind }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const dismissBurst = useCallback((id: number) => {
    setBursts((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      bursts,
      toasts,
      triggerReward,
      showToast,
      dismissBurst,
      dismissToast,
    }),
    [bursts, toasts, triggerReward, showToast, dismissBurst, dismissToast],
  );

  return (
    <RewardContext.Provider value={value}>{children}</RewardContext.Provider>
  );
}

export function useReward() {
  const ctx = useContext(RewardContext);
  if (!ctx) {
    throw new Error('useReward must be used within RewardProvider');
  }
  return ctx;
}

/** Center of a DOM element for burst origin */
export function burstOriginFromElement(el: HTMLElement | null): BurstOrigin | undefined {
  if (!el) {
    return undefined;
  }
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}
