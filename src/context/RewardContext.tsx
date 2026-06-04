import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useBalance } from '@/hooks/useBalance';

export type ToastKind = 'success' | 'info' | 'default';

export interface ToastItem {
  id: number;
  message: string;
  detail?: string;
  kind: ToastKind;
}

interface RewardContextValue {
  toasts: ToastItem[];
  showToast: (message: string, kind?: ToastKind, detail?: string) => void;
  dismissToast: (id: number) => void;
  /** 最近一次餘額增加量；約 1 秒後清除，供 GoalChip 浮字 */
  balanceCreditDelta: number | null;
}

const RewardContext = createContext<RewardContextValue | null>(null);

let toastId = 0;

export function RewardProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const { balance } = useBalance();
  const prevBalanceRef = useRef(balance);
  const skipInitialBalanceRef = useRef(true);
  const [balanceCreditDelta, setBalanceCreditDelta] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (skipInitialBalanceRef.current) {
      skipInitialBalanceRef.current = false;
      prevBalanceRef.current = balance;
      return;
    }
    const delta = balance - prevBalanceRef.current;
    prevBalanceRef.current = balance;
    if (delta <= 0) {
      return;
    }
    setBalanceCreditDelta(delta);
    const timer = window.setTimeout(() => setBalanceCreditDelta(null), 1000);
    return () => window.clearTimeout(timer);
  }, [balance]);

  const showToast = useCallback(
    (message: string, kind: ToastKind = 'default', detail?: string) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, message, detail, kind }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3200);
    },
    [],
  );

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      toasts,
      showToast,
      dismissToast,
      balanceCreditDelta,
    }),
    [toasts, showToast, dismissToast, balanceCreditDelta],
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
