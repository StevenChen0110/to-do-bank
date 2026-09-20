export type TaskCategory = string;

export type TransactionType = 'task_complete' | 'task_revoke' | 'wish_redeem';

export type TaskSize = 'small' | 'big';

/** Task priority; absent is treated as 'medium'. */
export type TaskPriority = 'high' | 'medium' | 'low';

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
  priority?: TaskPriority;
  /** Manual sort order within a priority band (lower = higher). */
  order?: number;
  /** Promoted to the top "任務" panel (Feishu-style). */
  pinned?: boolean;
  /** Parked in the staging ("暫放") area — off the day board until re-scheduled. */
  parked?: boolean;
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
  /** Real product this wish points at (Phase 1 e-commerce link). */
  productUrl?: string;
  /** Product image (OG-scraped or pasted) — shown on the shop card. */
  imageUrl?: string;
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
  /** Shop preference category ids — drives reward recommendations. */
  shopPreferences?: string[];
  /** JARVIS personal-context profile — drives relevance scoring. */
  jarvis?: JarvisProfile;
  /** Work OS: active 職能 template id (see lib/workRoles). */
  workRole?: string;
  /** Work OS: category ids scoped to 工作 (keeps personal ones out). */
  workCategoryIds?: string[];
  /** LINE daily-nudge preferences (set via the LINE bot). Preserved as-is. */
  nudge?: NudgeSettings;
}

/**
 * Personal-context profile for the JARVIS intelligence layer. Lives inside
 * AppSettings (synced with the rest of the blob); the server reads it to score
 * how relevant each piece of information is to this user. All fields optional
 * so an empty profile is valid.
 */
export interface JarvisProfile {
  /** Free-form interest tags: "AI", "product management", "投資"… */
  interests: string[];
  /** Tickers to track: "TSM", "NVDA", "0050"… */
  watchlist: string[];
  /** Markets followed: "TW", "US"… */
  markets: string[];
  /** Risk appetite for investment framing. */
  riskPreference?: 'low' | 'medium' | 'high';
  /** Career roles of interest: "Product Manager", "GTM"… */
  careerRoles: string[];
  /** Industries followed. */
  industries: string[];
  /** Names of current personal projects. */
  projects: string[];
  /** Companies to keep an eye on. */
  companies: string[];
}

export interface NudgeSettings {
  morning?: boolean;
  evening?: boolean;
  streak?: boolean;
  wish?: boolean;
  /** yyyy-MM-dd of last sent — idempotency, written by the cron. */
  lastMorning?: string;
  lastEvening?: string;
}

export type ProjectPhase = 'plan' | 'do' | 'check' | 'act';
export type ProjectTemplate = 'pdca' | 'checklist';
export type ProjectStatus = 'active' | 'done' | 'archived';

export interface ProjectStep {
  id: string;
  title: string;
  /** PDCA bucket; absent for checklist templates */
  phase?: ProjectPhase;
  /** Linked task once pushed into 待辦 */
  taskId: string | null;
  /** Local "done" for planning steps that were never pushed to a task */
  done: boolean;
}

export interface Project {
  id: string;
  title: string;
  /** 完成的樣子 */
  goal: string;
  template: ProjectTemplate;
  status: ProjectStatus;
  steps: ProjectStep[];
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  version: 1;
  tasks: Task[];
  wishes: Wish[];
  transactions: Transaction[];
  journalEntries: JournalEntry[];
  habits: Habit[];
  projects: Project[];
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
  priority?: TaskPriority;
}
