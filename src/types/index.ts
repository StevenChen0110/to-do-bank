export type TaskCategory = 'work' | 'study' | 'health' | 'life' | 'other';

export type TransactionType = 'task_complete' | 'task_revoke' | 'wish_redeem';

export type TaskSize = 'small' | 'big';

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

export interface JournalEntry {
  id: string;
  /** Local calendar day yyyy-MM-dd */
  date: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  /** Set when diary completion was credited as a task */
  creditedTaskId?: string;
}

export interface AppSettings {
  smallTaskReward: number;
  bigTaskReward: number;
  soundEnabled: boolean;
  diaryCountsAsTask: boolean;
  /** Dashboard + deposit narrative focus wish */
  pinnedWishId: string | null;
}

export interface AppData {
  version: 1;
  tasks: Task[];
  wishes: Wish[];
  transactions: Transaction[];
  journalEntries: JournalEntry[];
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

export interface LogTaskOptions {
  rewardAmount?: number;
  taskSize?: TaskSize;
}
