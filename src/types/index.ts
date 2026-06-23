export type TaskCategory = string;

export type TransactionType = 'task_complete' | 'task_revoke' | 'wish_redeem';

export type TaskSize = 'small' | 'big';

/** Derived from balance + redemption; not persisted on Wish */
export type WishStatus = 'locked' | 'available' | 'redeemed';

/** Where a task came from. Absent = added manually. */
export interface TaskSource {
  type: 'habit' | 'project';
  refId: string;
}

export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  reward: number;
  scheduledDate: string;
  completedAt: string | null;
  createdAt: string;
  source?: TaskSource;
}

export interface Habit {
  id: string;
  title: string;
  /** Habit-stacking cue ("刷牙後")，可空字串 */
  cue: string;
  category: TaskCategory;
  /** Reward credited per completion */
  reward: number;
  /** Days of week 0–6 (Sun–Sat); all seven = daily */
  weekdays: number[];
  startDate: string;
  /** 養成目標天數，預設 21 */
  targetDays: number;
  active: boolean;
  createdAt: string;
  archivedAt: string | null;
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

export interface CategoryDef {
  id: string;
  label: string;
}

export interface AppSettings {
  smallTaskReward: number;
  bigTaskReward: number;
  soundEnabled: boolean;
  diaryCountsAsTask: boolean;
  /** Dashboard + deposit narrative focus wish */
  pinnedWishId: string | null;
  /** User-defined categories appended after built-ins */
  customCategories: CategoryDef[];
}

export interface AppData {
  version: 1;
  tasks: Task[];
  wishes: Wish[];
  transactions: Transaction[];
  journalEntries: JournalEntry[];
  habits: Habit[];
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
