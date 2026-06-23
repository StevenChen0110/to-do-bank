import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import type {
  AppData,
  AppSettings,
  Habit,
  JournalEntry,
  LogTaskOptions,
  Project,
  ProjectPhase,
  ProjectStep,
  ProjectTemplate,
  Task,
  TaskCategory,
  Transaction,
  Wish,
} from '../types';
import { localDateString } from '../lib/dates';
import { dueToday } from '../lib/habits';
import {
  clearJournalCredit,
  DIARY_TASK_TITLE,
  shouldCreditDiaryOnSave,
} from '../lib/journal';
import { normalizeSettings, rewardForTaskSize } from '../lib/settings';
import { loadAppData, saveAppData } from '../lib/storage';

type PersistableState = Pick<
  AppData,
  'tasks' | 'wishes' | 'transactions' | 'journalEntries' | 'habits' | 'projects' | 'settings'
>;

interface AddHabitInput {
  title: string;
  cue?: string;
  category?: TaskCategory;
  reward?: number;
  weekdays?: number[];
  startDate?: string;
  targetDays?: number;
}

interface AppStore extends PersistableState {
  _hydrated: boolean;
  hydrate: () => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => void;
  addPendingTask: (
    title: string,
    category?: TaskCategory,
    date?: string,
    options?: LogTaskOptions,
  ) => Task | null;
  logCompletedTask: (
    title: string,
    category?: TaskCategory,
    date?: string,
    options?: LogTaskOptions,
  ) => Task | null;
  completeTask: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  saveJournalContent: (
    dateKey: string,
    content: string,
  ) => { entry: JournalEntry; creditedAmount: number | null };
  addWish: (input: Pick<Wish, 'title' | 'cost'>) => void;
  updateWish: (
    wishId: string,
    patch: Partial<Pick<Wish, 'title' | 'cost'>>,
  ) => void;
  deleteWish: (wishId: string) => void;
  redeemWish: (wishId: string) => void;
  setPinnedWishId: (wishId: string | null) => void;
  addCategory: (label: string) => void;
  deleteCategory: (id: string) => void;
  addHabit: (input: AddHabitInput) => void;
  updateHabit: (
    id: string,
    patch: Partial<
      Pick<Habit, 'title' | 'cue' | 'category' | 'reward' | 'weekdays' | 'targetDays' | 'active'>
    >,
  ) => void;
  archiveHabit: (id: string) => void;
  deleteHabit: (id: string) => void;
  /** Create today's missing habit task instances. Idempotent. */
  materializeHabitTasks: (dateKey: string) => void;
  addProject: (input: {
    title: string;
    goal?: string;
    template: ProjectTemplate;
  }) => void;
  updateProject: (
    id: string,
    patch: Partial<Pick<Project, 'title' | 'goal' | 'status'>>,
  ) => void;
  deleteProject: (id: string) => void;
  addStep: (projectId: string, title: string, phase?: ProjectPhase) => void;
  updateStep: (
    projectId: string,
    stepId: string,
    patch: Partial<Pick<ProjectStep, 'title' | 'done'>>,
  ) => void;
  deleteStep: (projectId: string, stepId: string) => void;
  /** Create a 待辦 task from a step and link it. */
  pushStepToTodo: (projectId: string, stepId: string, dateKey?: string) => void;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function persistPayload(state: PersistableState): AppData {
  return {
    version: 1,
    tasks: state.tasks,
    wishes: state.wishes,
    transactions: state.transactions,
    journalEntries: state.journalEntries,
    habits: state.habits,
    projects: state.projects,
    settings: state.settings,
  };
}

function schedulePersist(state: PersistableState): void {
  if (persistTimer !== null) {
    clearTimeout(persistTimer);
  }
  persistTimer = setTimeout(() => {
    void saveAppData(persistPayload(state));
  }, 300);
}

function persistNow(state: PersistableState): void {
  if (persistTimer !== null) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  void saveAppData(persistPayload(state));
}

function toPersistable(state: AppStore): PersistableState {
  return {
    tasks: state.tasks,
    wishes: state.wishes,
    transactions: state.transactions,
    journalEntries: state.journalEntries,
    habits: state.habits,
    projects: state.projects,
    settings: state.settings,
  };
}

function resolveReward(
  settings: AppSettings,
  options?: LogTaskOptions,
): number {
  if (options?.rewardAmount != null) {
    return options.rewardAmount;
  }
  if (options?.taskSize != null) {
    return rewardForTaskSize(settings, options.taskSize);
  }
  return settings.smallTaskReward;
}

function settingsWithoutPinned(
  settings: AppSettings,
  wishId: string,
): AppSettings {
  if (settings.pinnedWishId !== wishId) {
    return settings;
  }
  return { ...settings, pinnedWishId: null };
}

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

function createCompletedTask(
  state: AppStore,
  title: string,
  category: TaskCategory,
  scheduledDate: string,
  reward: number,
  now: string,
): AppStore {
  const task: Task = {
    id: uuidv4(),
    title,
    category,
    reward,
    scheduledDate,
    completedAt: now,
    createdAt: now,
  };

  const transaction: Transaction = {
    id: uuidv4(),
    type: 'task_complete',
    amount: reward,
    taskId: task.id,
    createdAt: now,
    note: title,
  };

  return {
    ...state,
    tasks: [task, ...state.tasks],
    transactions: [...state.transactions, transaction],
  };
}

export const useAppStore = create<AppStore>((set) => ({
  tasks: [],
  wishes: [],
  transactions: [],
  journalEntries: [],
  habits: [],
  projects: [],
  settings: normalizeSettings(undefined),
  _hydrated: false,

  hydrate: async () => {
    const data = await loadAppData();
    set({
      tasks: data.tasks,
      wishes: data.wishes,
      transactions: data.transactions,
      journalEntries: data.journalEntries,
      habits: data.habits,
      projects: data.projects,
      settings: data.settings,
      _hydrated: true,
    });
  },

  updateSettings: (patch) => {
    set((state) => {
      const nextSettings = normalizeSettings({
        ...state.settings,
        ...patch,
      });
      const next: AppStore = { ...state, settings: nextSettings };
      schedulePersist(toPersistable(next));
      return next;
    });
  },

  addPendingTask: (title, category = 'other', date, options) => {
    const trimmed = title.trim();
    if (!trimmed) return null;
    const now = new Date().toISOString();
    const scheduledDate = date ?? localDateString();
    let createdTask: Task | null = null;

    set((state) => {
      const reward = resolveReward(state.settings, options);
      const task: Task = {
        id: uuidv4(),
        title: trimmed.slice(0, 200),
        category,
        reward,
        scheduledDate,
        completedAt: null,
        createdAt: now,
      };
      createdTask = task;
      const next: AppStore = { ...state, tasks: [task, ...state.tasks] };
      schedulePersist(toPersistable(next));
      return next;
    });

    return createdTask;
  },

  logCompletedTask: (title, category = 'other', date, options) => {
    const trimmed = title.trim();
    if (!trimmed) {
      return null;
    }
    const now = new Date().toISOString();
    const scheduledDate = date ?? localDateString();
    let createdTask: Task | null = null;

    set((state) => {
      const reward = resolveReward(state.settings, options);
      const taskTitle = trimmed.slice(0, 200);
      const taskId = uuidv4();
      const task: Task = {
        id: taskId,
        title: taskTitle,
        category,
        reward,
        scheduledDate,
        completedAt: now,
        createdAt: now,
      };
      const transaction: Transaction = {
        id: uuidv4(),
        type: 'task_complete',
        amount: reward,
        taskId: task.id,
        createdAt: now,
        note: taskTitle,
      };
      createdTask = task;
      const next: AppStore = {
        ...state,
        tasks: [task, ...state.tasks],
        transactions: [...state.transactions, transaction],
      };
      schedulePersist(toPersistable(next));
      return next;
    });

    return createdTask;
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

  deleteTask: (taskId) => {
    const now = new Date().toISOString();
    set((state) => {
      const task = state.tasks.find((t) => t.id === taskId);
      if (!task) {
        return state;
      }

      const wasCredited = task.completedAt !== null;
      const transactions = wasCredited
        ? [
            ...state.transactions,
            {
              id: uuidv4(),
              type: 'task_revoke' as const,
              amount: -task.reward,
              taskId: task.id,
              createdAt: now,
              note: task.title,
            },
          ]
        : state.transactions;

      const next: AppStore = {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== taskId),
        transactions,
        journalEntries: state.journalEntries.map((j) =>
          j.creditedTaskId === taskId ? clearJournalCredit(j) : j,
        ),
      };
      persistNow(toPersistable(next));
      return next;
    });
  },

  saveJournalContent: (dateKey, content) => {
    const now = new Date().toISOString();
    let result: { entry: JournalEntry; creditedAmount: number | null } = {
      entry: {
        id: '',
        date: dateKey,
        content,
        createdAt: now,
        updatedAt: now,
      },
      creditedAmount: null,
    };

    set((state) => {
      const existing = state.journalEntries.find((e) => e.date === dateKey);
      const entry: JournalEntry = existing
        ? {
            ...existing,
            content,
            updatedAt: now,
          }
        : {
            id: uuidv4(),
            date: dateKey,
            content,
            createdAt: now,
            updatedAt: now,
          };

      let next: AppStore = {
        ...state,
        journalEntries: existing
          ? state.journalEntries.map((e) =>
              e.date === dateKey ? entry : e,
            )
          : [...state.journalEntries, entry],
      };

      let creditedAmount: number | null = null;

      if (
        shouldCreditDiaryOnSave(
          content,
          state.settings.diaryCountsAsTask,
          entry,
          next.tasks,
        )
      ) {
        const reward = state.settings.smallTaskReward;
        const credited = createCompletedTask(
          next,
          DIARY_TASK_TITLE,
          'life',
          dateKey,
          reward,
          now,
        );
        const newTask = credited.tasks[0];
        if (newTask) {
          const entryWithCredit: JournalEntry = {
            ...entry,
            creditedTaskId: newTask.id,
          };
          next = {
            ...credited,
            journalEntries: next.journalEntries.map((e) =>
              e.date === dateKey ? entryWithCredit : e,
            ),
          };
          creditedAmount = reward;
          result = { entry: entryWithCredit, creditedAmount };
        } else {
          result = { entry, creditedAmount: null };
        }
      } else {
        result = { entry, creditedAmount: null };
      }

      schedulePersist(toPersistable(next));
      return next;
    });

    return result;
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
        settings: settingsWithoutPinned(state.settings, wishId),
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
        settings: settingsWithoutPinned(state.settings, wishId),
      };
      schedulePersist(toPersistable(next));
      return next;
    });
  },

  setPinnedWishId: (wishId) => {
    set((state) => {
      const next: AppStore = {
        ...state,
        settings: { ...state.settings, pinnedWishId: wishId },
      };
      schedulePersist(toPersistable(next));
      return next;
    });
  },

  addCategory: (label) => {
    const trimmed = label.trim().slice(0, 20);
    if (!trimmed) return;
    set((state) => {
      if (
        state.settings.customCategories.some(
          (c) => c.label === trimmed,
        )
      ) {
        return state;
      }
      const next: AppStore = {
        ...state,
        settings: {
          ...state.settings,
          customCategories: [
            ...state.settings.customCategories,
            { id: uuidv4(), label: trimmed },
          ],
        },
      };
      schedulePersist(toPersistable(next));
      return next;
    });
  },

  deleteCategory: (id) => {
    set((state) => {
      const next: AppStore = {
        ...state,
        settings: {
          ...state.settings,
          customCategories: state.settings.customCategories.filter(
            (c) => c.id !== id,
          ),
        },
      };
      schedulePersist(toPersistable(next));
      return next;
    });
  },

  addHabit: (input) => {
    const title = input.title.trim().slice(0, 60);
    if (!title) return;
    const now = new Date().toISOString();
    set((state) => {
      const habit: Habit = {
        id: uuidv4(),
        title,
        cue: (input.cue ?? '').trim().slice(0, 60),
        category: input.category ?? 'other',
        reward: input.reward ?? state.settings.smallTaskReward,
        weekdays:
          input.weekdays && input.weekdays.length > 0
            ? [...input.weekdays].sort()
            : [0, 1, 2, 3, 4, 5, 6],
        startDate: input.startDate ?? localDateString(),
        targetDays: input.targetDays ?? 21,
        active: true,
        createdAt: now,
        archivedAt: null,
      };
      const next: AppStore = { ...state, habits: [...state.habits, habit] };
      schedulePersist(toPersistable(next));
      return next;
    });
  },

  updateHabit: (id, patch) => {
    set((state) => {
      const next: AppStore = {
        ...state,
        habits: state.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)),
      };
      schedulePersist(toPersistable(next));
      return next;
    });
  },

  archiveHabit: (id) => {
    const now = new Date().toISOString();
    set((state) => {
      const next: AppStore = {
        ...state,
        habits: state.habits.map((h) =>
          h.id === id ? { ...h, active: false, archivedAt: now } : h,
        ),
      };
      schedulePersist(toPersistable(next));
      return next;
    });
  },

  deleteHabit: (id) => {
    set((state) => {
      const next: AppStore = {
        ...state,
        habits: state.habits.filter((h) => h.id !== id),
      };
      schedulePersist(toPersistable(next));
      return next;
    });
  },

  materializeHabitTasks: (dateKey) => {
    set((state) => {
      const already = new Set(
        state.tasks
          .filter((t) => t.source?.type === 'habit' && t.scheduledDate === dateKey)
          .map((t) => t.source!.refId),
      );
      const now = new Date().toISOString();
      const created: Task[] = [];
      for (const h of state.habits) {
        if (!dueToday(h, dateKey) || already.has(h.id)) continue;
        created.push({
          id: uuidv4(),
          title: h.title,
          category: h.category,
          reward: h.reward,
          scheduledDate: dateKey,
          completedAt: null,
          createdAt: now,
          source: { type: 'habit', refId: h.id },
        });
      }
      if (created.length === 0) return state;
      const next: AppStore = { ...state, tasks: [...created, ...state.tasks] };
      schedulePersist(toPersistable(next));
      return next;
    });
  },

  addProject: (input) => {
    const title = input.title.trim().slice(0, 80);
    if (!title) return;
    const now = new Date().toISOString();
    set((state) => {
      const project: Project = {
        id: uuidv4(),
        title,
        goal: (input.goal ?? '').trim().slice(0, 200),
        template: input.template,
        status: 'active',
        steps: [],
        createdAt: now,
        updatedAt: now,
      };
      const next: AppStore = { ...state, projects: [project, ...state.projects] };
      schedulePersist(toPersistable(next));
      return next;
    });
  },

  updateProject: (id, patch) => {
    const now = new Date().toISOString();
    set((state) => {
      const next: AppStore = {
        ...state,
        projects: state.projects.map((p) =>
          p.id === id ? { ...p, ...patch, updatedAt: now } : p,
        ),
      };
      schedulePersist(toPersistable(next));
      return next;
    });
  },

  deleteProject: (id) => {
    set((state) => {
      const next: AppStore = {
        ...state,
        projects: state.projects.filter((p) => p.id !== id),
      };
      schedulePersist(toPersistable(next));
      return next;
    });
  },

  addStep: (projectId, title, phase) => {
    const trimmed = title.trim().slice(0, 120);
    if (!trimmed) return;
    const now = new Date().toISOString();
    set((state) => {
      const step: ProjectStep = {
        id: uuidv4(),
        title: trimmed,
        phase,
        taskId: null,
        done: false,
      };
      const next: AppStore = {
        ...state,
        projects: state.projects.map((p) =>
          p.id === projectId
            ? { ...p, steps: [...p.steps, step], updatedAt: now }
            : p,
        ),
      };
      schedulePersist(toPersistable(next));
      return next;
    });
  },

  updateStep: (projectId, stepId, patch) => {
    const now = new Date().toISOString();
    set((state) => {
      const next: AppStore = {
        ...state,
        projects: state.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                updatedAt: now,
                steps: p.steps.map((s) =>
                  s.id === stepId ? { ...s, ...patch } : s,
                ),
              }
            : p,
        ),
      };
      schedulePersist(toPersistable(next));
      return next;
    });
  },

  deleteStep: (projectId, stepId) => {
    const now = new Date().toISOString();
    set((state) => {
      const next: AppStore = {
        ...state,
        projects: state.projects.map((p) =>
          p.id === projectId
            ? { ...p, updatedAt: now, steps: p.steps.filter((s) => s.id !== stepId) }
            : p,
        ),
      };
      schedulePersist(toPersistable(next));
      return next;
    });
  },

  pushStepToTodo: (projectId, stepId, dateKey) => {
    const now = new Date().toISOString();
    const scheduledDate = dateKey ?? localDateString();
    set((state) => {
      const project = state.projects.find((p) => p.id === projectId);
      const step = project?.steps.find((s) => s.id === stepId);
      if (!project || !step) return state;
      if (step.taskId && state.tasks.some((t) => t.id === step.taskId)) {
        return state; // already pushed
      }
      const taskId = uuidv4();
      const task: Task = {
        id: taskId,
        title: (step.title || project.title).slice(0, 200),
        category: 'other',
        reward: state.settings.smallTaskReward,
        scheduledDate,
        completedAt: null,
        createdAt: now,
        source: { type: 'project', refId: projectId },
      };
      const next: AppStore = {
        ...state,
        tasks: [task, ...state.tasks],
        projects: state.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                updatedAt: now,
                steps: p.steps.map((s) =>
                  s.id === stepId ? { ...s, taskId } : s,
                ),
              }
            : p,
        ),
      };
      schedulePersist(toPersistable(next));
      return next;
    });
  },
}));
