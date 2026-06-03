export type TaskCategory = 'work' | 'study' | 'health' | 'life' | 'other';

export type TransactionType = 'task_complete' | 'task_revoke' | 'wish_redeem';

/** Derived from balance + redemption; not persisted on Wish */
export type WishStatus = 'locked' | 'available' | 'redeemed';

export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  reward: number;
  scheduledDate: string;
  completedAt: string | null;
  createdAt: string;
}

export interface Wish {
  id: string;
  title: string;
  cost: number;
  createdAt: string;
  redeemedAt: string | null;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  taskId?: string;
  wishId?: string;
  createdAt: string;
  note?: string;
}

export interface AppSettings {
  defaultTaskReward: number;
}

export interface AppData {
  version: 1;
  tasks: Task[];
  wishes: Wish[];
  transactions: Transaction[];
  settings: AppSettings;
}

/** Legacy persisted wish shape (Phase 1) */
export interface LegacyWish {
  id: string;
  title: string;
  cost: number;
  status?: 'active' | 'redeemed';
  createdAt: string;
  redeemedAt: string | null;
}
