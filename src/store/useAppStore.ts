import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import type {
  AppData,
  AppSettings,
  Task,
  TaskCategory,
  Transaction,
  Wish,
} from '../types';
import { localDateString } from '../lib/dates';
import { loadAppData, saveAppData } from '../lib/storage';

type PersistableState = Pick<
  AppData,
  'tasks' | 'wishes' | 'transactions' | 'settings'
>;

interface AppStore extends PersistableState {
  _hydrated: boolean;
  hydrate: () => Promise<void>;
  logCompletedTask: (
    title: string,
    category?: TaskCategory,
    date?: string,
  ) => void;
  completeTask: (taskId: string) => void;
  revokeTask: (taskId: string) => void;
  addWish: (input: Pick<Wish, 'title' | 'cost'>) => void;
  updateWish: (
    wishId: string,
    patch: Partial<Pick<Wish, 'title' | 'cost'>>,
  ) => void;
  deleteWish: (wishId: string) => void;
  redeemWish: (wishId: string) => void;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist(state: PersistableState): void {
  if (persistTimer !== null) {
    clearTimeout(persistTimer);
  }
  persistTimer = setTimeout(() => {
    void saveAppData({
      version: 1,
      tasks: state.tasks,
      wishes: state.wishes,
      transactions: state.transactions,
      settings: state.settings,
    });
  }, 300);
}

function toPersistable(state: AppStore): PersistableState {
  return {
    tasks: state.tasks,
    wishes: state.wishes,
    transactions: state.transactions,
    settings: state.settings,
  };
}

const initialSettings: AppSettings = {
  defaultTaskReward: 10,
};

function completeTaskInState(
  state: AppStore,
  taskId: string,
  now: string,
): AppStore | null {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task || task.completedAt !== null) {
    return null;
  }

  const transaction: Transaction = {
    id: uuidv4(),
    type: 'task_complete',
    amount: task.reward,
    taskId: task.id,
    createdAt: now,
    note: task.title,
  };

  return {
    ...state,
    tasks: state.tasks.map((t) =>
      t.id === taskId ? { ...t, completedAt: now } : t,
    ),
    transactions: [...state.transactions, transaction],
  };
}

export const useAppStore = create<AppStore>((set) => ({
  tasks: [],
  wishes: [],
  transactions: [],
  settings: initialSettings,
  _hydrated: false,

  hydrate: async () => {
    const data = await loadAppData();
    set({
      tasks: data.tasks,
      wishes: data.wishes,
      transactions: data.transactions,
      settings: data.settings,
      _hydrated: true,
    });
  },

  logCompletedTask: (title, category = 'other', date) => {
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    const now = new Date().toISOString();
    const scheduledDate = date ?? localDateString();
    set((state) => {
      const task: Task = {
        id: uuidv4(),
        title: trimmed.slice(0, 200),
        category,
        reward: state.settings.defaultTaskReward,
        scheduledDate,
        completedAt: null,
        createdAt: now,
      };
      const withTask: AppStore = {
        ...state,
        tasks: [task, ...state.tasks],
      };
      const completed = completeTaskInState(withTask, task.id, now);
      if (!completed) {
        return state;
      }
      schedulePersist(toPersistable(completed));
      return completed;
    });
  },

  completeTask: (taskId) => {
    const now = new Date().toISOString();
    set((state) => {
      const next = completeTaskInState(state, taskId, now);
      if (!next) {
        return state;
      }
      schedulePersist(toPersistable(next));
      return next;
    });
  },

  revokeTask: (taskId) => {
    const now = new Date().toISOString();
    set((state) => {
      const task = state.tasks.find((t) => t.id === taskId);
      if (!task || task.completedAt === null) {
        return state;
      }

      const transaction: Transaction = {
        id: uuidv4(),
        type: 'task_revoke',
        amount: -task.reward,
        taskId: task.id,
        createdAt: now,
        note: task.title,
      };

      const next: AppStore = {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { ...t, completedAt: null } : t,
        ),
        transactions: [...state.transactions, transaction],
      };
      schedulePersist(toPersistable(next));
      return next;
    });
  },

  addWish: (input) => {
    const now = new Date().toISOString();
    set((state) => {
      const wish: Wish = {
        id: uuidv4(),
        title: input.title.trim(),
        cost: input.cost,
        createdAt: now,
        redeemedAt: null,
      };
      const next: AppStore = {
        ...state,
        wishes: [...state.wishes, wish],
      };
      schedulePersist(toPersistable(next));
      return next;
    });
  },

  updateWish: (wishId, patch) => {
    set((state) => {
      const next: AppStore = {
        ...state,
        wishes: state.wishes.map((w) =>
          w.id === wishId && w.redeemedAt === null ? { ...w, ...patch } : w,
        ),
      };
      schedulePersist(toPersistable(next));
      return next;
    });
  },

  deleteWish: (wishId) => {
    set((state) => {
      const wish = state.wishes.find((w) => w.id === wishId);
      if (!wish || wish.redeemedAt !== null) {
        return state;
      }
      const next: AppStore = {
        ...state,
        wishes: state.wishes.filter((w) => w.id !== wishId),
      };
      schedulePersist(toPersistable(next));
      return next;
    });
  },

  redeemWish: (wishId) => {
    const now = new Date().toISOString();
    set((state) => {
      const wish = state.wishes.find((w) => w.id === wishId);
      if (!wish || wish.redeemedAt !== null) {
        return state;
      }

      const balance = state.transactions.reduce((s, tx) => s + tx.amount, 0);
      if (balance < wish.cost) {
        return state;
      }

      const transaction: Transaction = {
        id: uuidv4(),
        type: 'wish_redeem',
        amount: -wish.cost,
        wishId: wish.id,
        createdAt: now,
        note: wish.title,
      };

      const next: AppStore = {
        ...state,
        wishes: state.wishes.map((w) =>
          w.id === wishId ? { ...w, redeemedAt: now } : w,
        ),
        transactions: [...state.transactions, transaction],
      };
      schedulePersist(toPersistable(next));
      return next;
    });
  },
}));
