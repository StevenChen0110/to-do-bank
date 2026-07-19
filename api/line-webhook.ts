import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET!;
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!;

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!,
);

// ── helpers ──────────────────────────────────────────────────────

function todayTaipei(): string {
  // UTC+8
  const d = new Date(Date.now() + 8 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

function fmt(n: number): string {
  return `NT$${Math.round(n).toLocaleString()}`;
}

// ── data layer ───────────────────────────────────────────────────

const EMPTY: AppData = {
  version: 1,
  tasks: [],
  wishes: [],
  transactions: [],
  journalEntries: [],
  habits: [],
  projects: [],
  settings: {
    smallTaskReward: 10,
    bigTaskReward: 30,
    soundEnabled: false,
    diaryCountsAsTask: false,
    pinnedWishId: null,
    customCategories: [],
  },
};

interface TaskSource { type: 'habit' | 'project'; refId: string; }
interface Task {
  id: string; title: string; category: string; reward: number;
  scheduledDate: string; completedAt: string | null; createdAt: string;
  source?: TaskSource;
}
interface Wish {
  id: string; title: string; cost: number; createdAt: string; redeemedAt: string | null;
}
interface Transaction {
  id: string; type: string; amount: number;
  taskId?: string; wishId?: string; createdAt: string; note?: string;
}
interface Habit {
  id: string; title: string; cue: string; category: string; reward: number;
  weekdays: number[]; startDate: string; targetDays: number;
  active: boolean; createdAt: string; archivedAt: string | null;
}
interface ProjectStep {
  id: string; title: string; phase?: string; taskId: string | null; done: boolean;
}
interface Project {
  id: string; title: string; goal: string; template: string; status: string;
  steps: ProjectStep[]; createdAt: string; updatedAt: string;
}
interface NudgeSettings {
  morning?: boolean; evening?: boolean; streak?: boolean; wish?: boolean;
  lastMorning?: string; lastEvening?: string;
}
interface Settings {
  smallTaskReward: number; bigTaskReward: number; soundEnabled: boolean;
  diaryCountsAsTask: boolean; pinnedWishId: string | null;
  customCategories: { id: string; label: string }[];
  nudge?: NudgeSettings;
}
interface AppData {
  version: 1; tasks: Task[]; wishes: Wish[];
  transactions: Transaction[]; journalEntries: unknown[];
  habits: Habit[]; projects: Project[]; settings: Settings;
}

async function load(userId: string): Promise<AppData> {
  const { data: row } = await supabase
    .from('user_data').select('data').eq('user_id', userId).maybeSingle();
  if (!row?.data) return structuredClone(EMPTY);
  const d = row.data as Partial<AppData>;
  return {
    version: 1,
    tasks: d.tasks ?? [],
    wishes: d.wishes ?? [],
    transactions: d.transactions ?? [],
    journalEntries: d.journalEntries ?? [],
    habits: d.habits ?? [],
    projects: d.projects ?? [],
    settings: { ...EMPTY.settings, ...(d.settings ?? {}) },
  };
}

/** yyyy-MM-dd shifted by delta days (TZ-stable via UTC). */
function shiftDay(key: string, delta: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function weekdayOf(key: string): number {
  return new Date(`${key}T00:00:00Z`).getUTCDay();
}

/** Create today's missing habit task instances (mutates data). Idempotent. */
function materializeHabits(data: AppData, today: string): boolean {
  const weekday = weekdayOf(today);
  const existing = new Set(
    data.tasks
      .filter((t) => t.source?.type === 'habit' && t.scheduledDate === today)
      .map((t) => t.source!.refId),
  );
  const now = new Date().toISOString();
  let changed = false;
  for (const h of data.habits) {
    if (!h.active || today < h.startDate) continue;
    if (!h.weekdays.includes(weekday) || existing.has(h.id)) continue;
    data.tasks.unshift({
      id: uuidv4(), title: h.title, category: h.category, reward: h.reward,
      scheduledDate: today, completedAt: null, createdAt: now,
      source: { type: 'habit', refId: h.id },
    });
    changed = true;
  }
  return changed;
}

function habitStreak(data: AppData, habitId: string, today: string): number {
  const done = new Set(
    data.tasks
      .filter((t) => t.source?.type === 'habit' && t.source.refId === habitId && t.completedAt !== null)
      .map((t) => t.scheduledDate),
  );
  let streak = 0;
  let cur = done.has(today) ? today : shiftDay(today, -1);
  while (done.has(cur)) {
    streak += 1;
    cur = shiftDay(cur, -1);
  }
  return streak;
}

async function save(userId: string, data: AppData): Promise<void> {
  await supabase.from('user_data')
    .upsert({ user_id: userId, data, updated_at: new Date().toISOString() });
}

// ── LINE message layer ───────────────────────────────────────────

const BRAND = '#00804F';
const MUTED = '#9CA3AF';
const APP_URL = 'https://to-do-bank.vercel.app';

type LineMessage = Record<string, unknown>;
/** A handler may return a plain string (auto-wrapped as text) or ready messages. */
type LineReturn = string | LineMessage[];

async function replyMessages(replyToken: string, messages: LineMessage[]): Promise<void> {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  });
}

// Quick-reply buttons attached to every reply — tap once to navigate (it sends
// a message). Four items fit a single row on both mobile and desktop LINE.
const MENU_QR = {
  items: [
    { type: 'action', action: { type: 'postback', label: '📋 待辦', data: 'a=list', displayText: '待辦' } },
    { type: 'action', action: { type: 'postback', label: '🐷 撲滿', data: 'a=bank', displayText: '撲滿' } },
    { type: 'action', action: { type: 'postback', label: '🌟 願望', data: 'a=wishes', displayText: '願望' } },
    { type: 'action', action: { type: 'postback', label: '🌱 養成', data: 'a=growth', displayText: '養成' } },
  ],
};

function normalize(ret: LineReturn): LineMessage[] {
  const msgs: LineMessage[] = typeof ret === 'string' ? [{ type: 'text', text: ret }] : ret;
  const last = msgs[msgs.length - 1];
  if (last && !('quickReply' in last)) last.quickReply = MENU_QR;
  return msgs;
}

const WELCOME = `🐷 歡迎使用 To Do Bank！

完成待辦就把虛擬 NT$ 存進撲滿，存夠了就兌換你的願望 🎁

點下方按鈕，或試試：
• 直接打字輸入事項就能新增（例：讀書30分鐘）
• 待辦（看今日清單，點 ✅ 完成、點金額切 小/大）
• 撲滿 / 願望 / 養成

🖥 完整版網頁（規劃/習慣/專案/設定更好操作）：
${APP_URL}
輸入「綁定」可與網頁版同步同一份資料。`;

/** A card that links out to the full web app. */
function webFlexMsg(): LineMessage {
  return {
    type: 'flex', altText: '網頁版',
    contents: {
      type: 'bubble',
      body: {
        type: 'box', layout: 'vertical', spacing: 'md',
        contents: [
          { type: 'text', text: '🖥 網頁版', weight: 'bold', size: 'lg', color: BRAND },
          { type: 'text', text: '在電腦或手機瀏覽器開啟完整版，規劃、習慣、專案、設定都更好操作（資料同步）。', size: 'sm', color: MUTED, wrap: true },
          { type: 'button', style: 'primary', color: BRAND, height: 'sm', action: { type: 'uri', label: '開啟 To Do Bank 網頁版', uri: APP_URL } },
          { type: 'text', text: APP_URL, size: 'xxs', color: MUTED, wrap: true },
        ],
      },
    },
  };
}

// ── Flex card builders ───────────────────────────────────────────

function progressBar(pct: number): LineMessage {
  return {
    type: 'box', layout: 'vertical', backgroundColor: '#E5E7EB',
    height: '8px', cornerRadius: '4px', margin: 'md',
    contents: [{
      type: 'box', layout: 'vertical', width: `${Math.max(2, Math.min(100, pct))}%`,
      backgroundColor: BRAND, height: '8px', cornerRadius: '4px',
      contents: [{ type: 'filler' }],
    }],
  };
}

function todoFlexMsg(data: AppData, today: string): LineMessage {
  const todayTasks = data.tasks.filter((t) => t.scheduledDate === today);
  const pending = todayTasks.filter((t) => t.completedAt === null);
  const done = todayTasks.filter((t) => t.completedAt !== null);
  const earned = done.reduce((s, t) => s + t.reward, 0);
  const rows: LineMessage[] = [];
  if (pending.length === 0) {
    rows.push({
      type: 'text', margin: 'md', size: 'sm', color: MUTED, wrap: true,
      text: todayTasks.length ? '今天都完成了 🎉' : '今天還沒有待辦，輸入「新增 事項」',
    });
  }
  const big = data.settings.bigTaskReward;
  const small = data.settings.smallTaskReward;
  const hasSizes = big !== small;
  // Pending: each task is a block — bold title + [改大/改小] + [✅ 完成] buttons.
  pending.slice(0, 12).forEach((t, i) => {
    const isBig = t.reward >= big && hasSizes;
    const sizeEl: LineMessage = !t.source && hasSizes
      ? {
          type: 'button', height: 'sm', style: 'secondary', flex: 1, gravity: 'center',
          action: {
            type: 'postback',
            label: isBig ? `改小 ${fmt(small)}` : `改大 ${fmt(big)}`,
            data: `a=size&id=${t.id}`,
          },
        }
      : { type: 'text', text: `+${fmt(t.reward)}`, size: 'sm', color: MUTED, flex: 1, gravity: 'center', align: 'center' };
    rows.push({
      type: 'box', layout: 'vertical', spacing: 'sm', margin: i === 0 ? 'lg' : 'xl',
      contents: [
        { type: 'text', text: t.title, size: 'sm', weight: 'bold', wrap: true },
        {
          type: 'box', layout: 'horizontal', spacing: 'sm',
          contents: [
            sizeEl,
            {
              type: 'button', height: 'sm', style: 'primary', color: BRAND, flex: 1,
              action: { type: 'postback', label: '✅ 完成', data: `a=done&id=${t.id}` },
            },
            {
              type: 'button', height: 'sm', style: 'secondary', flex: 0,
              action: { type: 'postback', label: '🗑', data: `a=del&id=${t.id}` },
            },
          ],
        },
      ],
    });
  });
  // Completed: clearly distinct — muted "✔ title +NT$" lines under a heading.
  if (done.length > 0) {
    rows.push({ type: 'text', text: '── 已完成 ──', size: 'xxs', color: MUTED, margin: 'xl', align: 'center' });
    done.slice(0, 8).forEach((t) => {
      rows.push({ type: 'text', text: `✔ ${t.title}　+${fmt(t.reward)}`, size: 'xs', color: MUTED, margin: 'sm', wrap: true });
    });
  }
  return {
    type: 'flex', altText: `今日待辦 完成 ${done.length}/${todayTasks.length}`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box', layout: 'vertical',
        contents: [
          { type: 'text', text: '📋 今日待辦', weight: 'bold', size: 'lg', color: BRAND },
          { type: 'text', text: `${today}　完成 ${done.length}/${todayTasks.length}　今日 +${fmt(earned)}`, size: 'xxs', color: MUTED, margin: 'sm' },
          { type: 'separator', margin: 'md' },
          ...rows,
        ],
      },
      footer: {
        type: 'box', layout: 'vertical',
        contents: [
          { type: 'text', text: '＋ 直接打字即可新增待辦', size: 'xxs', color: MUTED, align: 'center' },
        ],
      },
    },
  };
}

function bankFlexMsg(data: AppData): LineMessage {
  const balance = data.transactions.reduce((s, tx) => s + tx.amount, 0);
  const totalEarned = data.transactions.filter((tx) => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
  const pinned = data.wishes.find((w) => w.id === data.settings.pinnedWishId && !w.redeemedAt);
  const contents: LineMessage[] = [
    { type: 'text', text: '🐷 撲滿餘額', size: 'sm', color: MUTED },
    { type: 'text', text: fmt(balance), weight: 'bold', size: '3xl', color: BRAND },
    { type: 'text', text: `累計獲得 ${fmt(totalEarned)}`, size: 'xs', color: MUTED, margin: 'sm' },
  ];
  if (pinned) {
    const pct = Math.min(100, Math.round((balance / pinned.cost) * 100));
    const shortfall = Math.max(0, pinned.cost - balance);
    contents.push({ type: 'separator', margin: 'lg' });
    contents.push({ type: 'text', text: `🎯 ${pinned.title}`, weight: 'bold', size: 'sm', margin: 'lg', wrap: true });
    contents.push(progressBar(pct));
    contents.push({ type: 'text', text: shortfall > 0 ? `${pct}%　還差 ${fmt(shortfall)}` : `${pct}%　可兌換 🎁`, size: 'xs', color: MUTED, margin: 'sm' });
  }
  return {
    type: 'flex', altText: `撲滿餘額 ${fmt(balance)}`,
    contents: {
      type: 'bubble',
      body: { type: 'box', layout: 'vertical', contents },
      footer: {
        type: 'box', layout: 'vertical',
        contents: [
          { type: 'button', style: 'secondary', height: 'sm', action: { type: 'uri', label: '🖥 開啟網頁版', uri: APP_URL } },
        ],
      },
    },
  };
}

function wishesFlexMsg(data: AppData): LineMessage {
  const balance = data.transactions.reduce((s, tx) => s + tx.amount, 0);
  const pinnedId = data.settings.pinnedWishId;
  // 主目標（釘選）永遠置頂
  const active = data.wishes
    .filter((w) => !w.redeemedAt)
    .sort((a, b) => (b.id === pinnedId ? 1 : 0) - (a.id === pinnedId ? 1 : 0));
  const blocks: LineMessage[] = [];
  if (active.length === 0) {
    blocks.push({ type: 'text', text: '還沒有願望，輸入「願望 名稱 金額」新增', size: 'sm', color: MUTED, wrap: true, margin: 'md' });
  }
  active.slice(0, 8).forEach((w, i) => {
    const pct = Math.min(100, Math.round((balance / w.cost) * 100));
    const can = balance >= w.cost;
    const btns: LineMessage[] = [];
    if (w.id !== pinnedId) {
      btns.push({ type: 'button', style: 'secondary', height: 'sm', action: { type: 'postback', label: '🎯 釘選', data: `a=pin&id=${w.id}`, displayText: `釘選 ${w.title}` } });
    }
    if (can) {
      btns.push({ type: 'button', style: 'primary', color: BRAND, height: 'sm', action: { type: 'postback', label: '🎁 兌換', data: `a=redeem&id=${w.id}`, displayText: `兌換 ${w.title}` } });
    }
    if (i > 0) blocks.push({ type: 'separator', margin: 'lg' });
    blocks.push({
      type: 'box', layout: 'vertical', margin: i > 0 ? 'lg' : 'md',
      contents: [
        {
          type: 'box', layout: 'horizontal',
          contents: [
            { type: 'text', text: `${w.id === pinnedId ? '🎯 ' : ''}${w.title}`, size: 'sm', weight: 'bold', flex: 5, wrap: true },
            { type: 'text', text: fmt(w.cost), size: 'xs', color: MUTED, flex: 2, align: 'end', gravity: 'center' },
          ],
        },
        progressBar(pct),
        { type: 'text', text: can ? `${pct}%　可兌換` : `${pct}%`, size: 'xxs', color: MUTED, margin: 'sm' },
        ...(btns.length ? [{ type: 'box', layout: 'horizontal', spacing: 'sm', margin: 'sm', contents: btns }] : []),
      ],
    });
  });
  return {
    type: 'flex', altText: '願望清單',
    contents: {
      type: 'bubble',
      body: {
        type: 'box', layout: 'vertical',
        contents: [
          { type: 'text', text: '🌟 願望清單', weight: 'bold', size: 'lg', color: BRAND },
          { type: 'separator', margin: 'md' },
          ...blocks,
        ],
      },
    },
  };
}

function habitsFlexMsg(data: AppData, today: string): LineMessage {
  const list = data.habits.filter((h) => h.active);
  const weekday = weekdayOf(today);
  const rows: LineMessage[] = [];
  if (list.length === 0) {
    rows.push({ type: 'text', text: '還沒有習慣，輸入「習慣 新增 名稱」', size: 'sm', color: MUTED, wrap: true, margin: 'md' });
  }
  list.slice(0, 12).forEach((h) => {
    const due = today >= h.startDate && h.weekdays.includes(weekday);
    const task = data.tasks.find(
      (x) => x.source?.type === 'habit' && x.source.refId === h.id && x.scheduledDate === today,
    );
    const doneToday = task?.completedAt != null;
    const streak = habitStreak(data, h.id, today);
    const cells: LineMessage[] = [
      { type: 'text', text: `${!due ? '😴' : doneToday ? '✅' : '⭕'} ${h.title}`, size: 'sm', flex: 6, wrap: true, gravity: 'center' },
      { type: 'text', text: `🔥${streak}`, size: 'xs', color: MUTED, flex: 2, align: 'end', gravity: 'center' },
    ];
    if (due && !doneToday && task) {
      cells.push({ type: 'button', height: 'sm', style: 'primary', color: BRAND, flex: 0, action: { type: 'postback', label: '✅ 完成', data: `a=done&id=${task.id}` } });
    }
    rows.push({ type: 'box', layout: 'horizontal', alignItems: 'center', spacing: 'sm', margin: 'md', contents: cells });
  });
  return {
    type: 'flex', altText: '今日習慣',
    contents: {
      type: 'bubble',
      body: {
        type: 'box', layout: 'vertical',
        contents: [
          { type: 'text', text: '🔁 今日習慣', weight: 'bold', size: 'lg', color: BRAND },
          { type: 'separator', margin: 'md' },
          ...rows,
        ],
      },
    },
  };
}

/** 養成 tab → 跳出「習慣 / 專案」讓使用者選要看哪個內容。 */
function growthFlexMsg(data: AppData): LineMessage {
  const habitCount = data.habits.filter((h) => h.active).length;
  const projCount = data.projects.filter((p) => p.status === 'active').length;
  return {
    type: 'flex', altText: '養成',
    contents: {
      type: 'bubble',
      body: {
        type: 'box', layout: 'vertical', spacing: 'md',
        contents: [
          { type: 'text', text: '🌱 養成', weight: 'bold', size: 'lg', color: BRAND },
          { type: 'text', text: '想看哪個？', size: 'xs', color: MUTED },
          { type: 'button', style: 'secondary', height: 'sm', action: { type: 'postback', label: `🔁 習慣 (${habitCount})`, data: 'a=habits', displayText: '習慣' } },
          { type: 'button', style: 'secondary', height: 'sm', action: { type: 'postback', label: `📁 專案 (${projCount})`, data: 'a=projects', displayText: '專案' } },
        ],
      },
    },
  };
}

function projectsFlexMsg(data: AppData): LineMessage {
  const active = data.projects.filter((p) => p.status === 'active');
  const rows: LineMessage[] = [];
  if (active.length === 0) {
    rows.push({ type: 'text', text: '還沒有專案，到網頁版「養成 → 專案」規劃步驟', size: 'sm', color: MUTED, wrap: true, margin: 'md' });
  }
  active.slice(0, 8).forEach((p, i) => {
    const total = p.steps.length;
    const done = p.steps.filter((s) =>
      s.taskId ? data.tasks.find((x) => x.id === s.taskId)?.completedAt != null : s.done,
    ).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    if (i > 0) rows.push({ type: 'separator', margin: 'lg' });
    rows.push({
      type: 'box', layout: 'vertical', margin: i > 0 ? 'lg' : 'md',
      contents: [
        { type: 'text', text: p.title, size: 'sm', weight: 'bold', wrap: true },
        progressBar(pct),
        { type: 'text', text: `${done}/${total}（${pct}%）`, size: 'xxs', color: MUTED, margin: 'sm' },
      ],
    });
  });
  return {
    type: 'flex', altText: '專案',
    contents: {
      type: 'bubble',
      body: {
        type: 'box', layout: 'vertical',
        contents: [
          { type: 'text', text: '📁 專案', weight: 'bold', size: 'lg', color: BRAND },
          { type: 'separator', margin: 'md' },
          ...rows,
        ],
      },
    },
  };
}

// ── command router ───────────────────────────────────────────────

type NudgeKey = 'morning' | 'evening' | 'streak' | 'wish';
const NUDGE_ROWS: { key: NudgeKey; label: string; desc: string }[] = [
  { key: 'morning', label: '☀️ 早安立志', desc: '今天想完成什麼（約 8:00）' },
  { key: 'evening', label: '🌙 晚間收割', desc: '今天入帳與未完成（約 21:00）' },
  { key: 'streak', label: '🔥 連續救援', desc: '習慣快斷時提醒（晚間）' },
  { key: 'wish', label: '🎁 願望臨門', desc: '快存夠時提醒（晚間）' },
];

function nudgeFlexMsg(data: AppData): LineMessage {
  const n = data.settings.nudge ?? {};
  const isOn = (k: NudgeKey) => n[k] !== false; // default on
  return {
    type: 'flex', altText: '每日提醒設定',
    contents: {
      type: 'bubble',
      body: {
        type: 'box', layout: 'vertical',
        contents: [
          { type: 'text', text: '⏰ 每日提醒', weight: 'bold', size: 'lg', color: BRAND },
          { type: 'text', text: '點右側按鈕開關每種提醒。', size: 'xxs', color: MUTED, margin: 'sm' },
          { type: 'separator', margin: 'md' },
          ...NUDGE_ROWS.map((r) => ({
            type: 'box', layout: 'horizontal', alignItems: 'center', spacing: 'sm', margin: 'lg',
            contents: [
              {
                type: 'box', layout: 'vertical', flex: 1,
                contents: [
                  { type: 'text', text: r.label, size: 'sm', weight: 'bold' },
                  { type: 'text', text: r.desc, size: 'xxs', color: MUTED, wrap: true },
                ],
              },
              {
                type: 'button', height: 'sm', flex: 0,
                style: isOn(r.key) ? 'primary' : 'secondary',
                ...(isOn(r.key) ? { color: BRAND } : {}),
                action: { type: 'postback', label: isOn(r.key) ? '開' : '關', data: `a=nudge&k=${r.key}&v=${isOn(r.key) ? 0 : 1}` },
              },
            ],
          })),
        ],
      },
    },
  };
}

const HELP = `📖 To Do Bank 指令

💡 直接打字輸入事項就能新增待辦，不用前綴。
其餘點下方按鈕或卡片上的按鈕操作，卡片金額可點切換 小/大。

【待辦】
直接打字輸入事項 = 新增（卡片點金額切 小/大）
完成 [待辦] — 完成並入帳
刪除 [待辦] — 刪除待辦
待辦 — 今日待辦清單

【習慣】
習慣 — 今日習慣與連續天數
習慣 新增 [名稱] — 建立每日習慣

【願望】
願望 [名稱] [金額] — 新增願望
願望清單 — 查看進度
釘選 [願望] — 設為主目標
兌換 [願望] — 用餘額兌換
刪除願望 [願望] — 刪除願望

【其他】
撲滿 — 查看餘額與目標
養成 — 習慣與專案
網頁 — 開啟網頁版（電腦操作）
提醒 — 開關每日督促推播
綁定 — 取得網頁配對碼
說明 — 顯示此說明`;

async function createPairingCode(lineUserId: string): Promise<string> {
  // 6 chars, no ambiguous 0/O/1/I
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await supabase
    .from('pairing_codes')
    .upsert({ code, line_user_id: lineUserId, expires_at: expiresAt });
  return code;
}

async function handle(userId: string, text: string): Promise<LineReturn> {
  const t = text.trim();
  const today = todayTaipei();

  // 不需要讀資料的指令
  if (['說明', '?', '？', 'help'].includes(t)) return HELP;
  if (['網頁', '網頁版', '電腦版', 'web'].includes(t)) return [webFlexMsg()];
  if (t === '我的ID' || t === '我的id') {
    return `你的 LINE ID：\n${userId}`;
  }
  if (['綁定', '配對', '連結'].includes(t)) {
    const code = await createPairingCode(userId);
    return `🔗 你的配對碼：\n\n${code}\n\n10 分鐘內到網頁版「設定 → 連結 LINE」輸入這組碼，手機與電腦就會同步同一份資料。`;
  }

  const data = await load(userId);
  const now = new Date().toISOString();
  const bal = () => data.transactions.reduce((s, tx) => s + tx.amount, 0);

  // ── 新增習慣 ────────────────────────────
  if (t.startsWith('習慣 新增 ')) {
    const title = t.slice(6).trim();
    if (!title) return '請輸入習慣名稱，例如：習慣 新增 喝水';
    const reward = data.settings.smallTaskReward;
    data.habits.push({
      id: uuidv4(), title: title.slice(0, 60), cue: '', category: 'other',
      reward, weekdays: [0, 1, 2, 3, 4, 5, 6], startDate: today, targetDays: 21,
      active: true, createdAt: now, archivedAt: null,
    });
    materializeHabits(data, today);
    await save(userId, data);
    return [habitsFlexMsg(data, today)];
  }

  // ── 今日習慣 ────────────────────────────
  if (t === '習慣') {
    if (materializeHabits(data, today)) await save(userId, data);
    return [habitsFlexMsg(data, today)];
  }

  // ── 養成 / 專案 ────────────────────────────
  if (t === '養成') return [growthFlexMsg(data)];
  if (t === '專案') return [projectsFlexMsg(data)];

  // ── 提醒設定 ────────────────────────────
  if (['提醒', '通知', '督促'].includes(t)) return [nudgeFlexMsg(data)];

  // ── 新增大任務 ──────────────────────────
  if (t.startsWith('新增大 ')) {
    const title = t.slice(4).trim();
    if (!title) return '請輸入待辦名稱，例如：新增大 健身一小時';
    const reward = data.settings.bigTaskReward;
    data.tasks.unshift({
      id: uuidv4(), title: title.slice(0, 200), category: 'other',
      reward, scheduledDate: today, completedAt: null, createdAt: now,
    });
    await save(userId, data);
    return [todoFlexMsg(data, today)];
  }

  // ── 新增待辦 ────────────────────────────
  if (t.startsWith('新增 ') || t.startsWith('+ ')) {
    const title = t.startsWith('新增 ') ? t.slice(3).trim() : t.slice(2).trim();
    if (!title) return '請輸入待辦名稱，例如：新增 讀書30分鐘';
    const reward = data.settings.smallTaskReward;
    data.tasks.unshift({
      id: uuidv4(), title: title.slice(0, 200), category: 'other',
      reward, scheduledDate: today, completedAt: null, createdAt: now,
    });
    await save(userId, data);
    return [todoFlexMsg(data, today)];
  }

  // ── 完成待辦 ────────────────────────────
  if (t.startsWith('完成 ') || t.startsWith('✅ ')) {
    const kw = t.startsWith('完成 ') ? t.slice(3).trim() : t.slice(2).trim();
    materializeHabits(data, today); // surface today's habit tasks so they're completable
    const pending = data.tasks.filter(t => t.completedAt === null && t.scheduledDate === today);
    const match = pending.find(t => t.title.includes(kw));
    if (!match) {
      const list = pending.map((t, i) => `${i + 1}. ${t.title}`).join('\n');
      return list
        ? `找不到「${kw}」\n\n今日待辦：\n${list}`
        : '今日沒有待辦事項';
    }
    match.completedAt = now;
    data.transactions.push({
      id: uuidv4(), type: 'task_complete', amount: match.reward,
      taskId: match.id, createdAt: now, note: match.title,
    });
    await save(userId, data);
    return [match.source?.type === 'habit' ? habitsFlexMsg(data, today) : todoFlexMsg(data, today)];
  }

  // ── 刪除待辦 ────────────────────────────
  if (t.startsWith('刪除 ')) {
    const kw = t.slice(3).trim();
    const idx = data.tasks.findIndex(t => t.title.includes(kw) && t.scheduledDate === today);
    if (idx === -1) return `找不到「${kw}」`;
    const task = data.tasks[idx];
    data.tasks.splice(idx, 1);
    if (task.completedAt !== null) {
      data.transactions.push({
        id: uuidv4(), type: 'task_revoke', amount: -task.reward,
        taskId: task.id, createdAt: now, note: task.title,
      });
    }
    await save(userId, data);
    return [todoFlexMsg(data, today)];
  }

  // ── 今日待辦 ────────────────────────────
  if (['待辦', '今日', '代辦'].includes(t)) {
    if (materializeHabits(data, today)) await save(userId, data);
    return [todoFlexMsg(data, today)];
  }

  // ── 撲滿 / 餘額 ─────────────────────────
  if (['撲滿', '餘額', '存款', '餘额'].includes(t)) {
    return [bankFlexMsg(data)];
  }

  // ── 新增願望 ────────────────────────────
  if (t.startsWith('願望 ') && !t.includes('清單')) {
    const rest = t.slice(3).trim();
    const lastSpace = rest.lastIndexOf(' ');
    if (lastSpace === -1) return '格式：願望 [名稱] [金額]\n例如：願望 AirPods 3000';
    const title = rest.slice(0, lastSpace).trim();
    const cost = parseInt(rest.slice(lastSpace + 1).replace(/[^0-9]/g, ''), 10);
    if (!title || isNaN(cost) || cost <= 0) return '格式：願望 [名稱] [金額]\n例如：願望 AirPods 3000';
    data.wishes.push({ id: uuidv4(), title, cost, createdAt: now, redeemedAt: null });
    await save(userId, data);
    return [wishesFlexMsg(data)];
  }

  // ── 願望清單 ────────────────────────────
  if (t === '願望清單') {
    return [wishesFlexMsg(data)];
  }

  // 找出未兌換的願望（用名稱關鍵字）
  const findWish = (kw: string) =>
    data.wishes.find(w => !w.redeemedAt && w.title.includes(kw));

  // ── 釘選主目標 ──────────────────────────
  if (t.startsWith('釘選 ')) {
    const kw = t.slice(3).trim();
    const wish = findWish(kw);
    if (!wish) return `找不到願望「${kw}」`;
    data.settings.pinnedWishId = wish.id;
    await save(userId, data);
    return [bankFlexMsg(data)];
  }
  if (t === '取消釘選') {
    data.settings.pinnedWishId = null;
    await save(userId, data);
    return [wishesFlexMsg(data)];
  }

  // ── 兌換願望 ────────────────────────────
  if (t.startsWith('兌換 ')) {
    const kw = t.slice(3).trim();
    if (!kw) return '格式：兌換 [願望名稱]';
    const wish = findWish(kw);
    if (!wish) return `找不到願望「${kw}」`;
    const balance = bal();
    if (balance < wish.cost) {
      return `餘額不足，無法兌換「${wish.title}」\n還差 ${fmt(wish.cost - balance)}`;
    }
    wish.redeemedAt = now;
    data.transactions.push({
      id: uuidv4(), type: 'wish_redeem', amount: -wish.cost,
      wishId: wish.id, createdAt: now, note: wish.title,
    });
    if (data.settings.pinnedWishId === wish.id) data.settings.pinnedWishId = null;
    await save(userId, data);
    return [wishesFlexMsg(data)];
  }

  // ── 刪除願望 ────────────────────────────
  if (t.startsWith('刪除願望 ')) {
    const kw = t.slice(5).trim();
    const idx = data.wishes.findIndex(w => !w.redeemedAt && w.title.includes(kw));
    if (idx === -1) return `找不到願望「${kw}」`;
    const w = data.wishes[idx];
    data.wishes.splice(idx, 1);
    if (data.settings.pinnedWishId === w.id) data.settings.pinnedWishId = null;
    await save(userId, data);
    return [wishesFlexMsg(data)];
  }

  // 其餘任何文字 → 直接當成新的小任務（不需「新增」前綴）
  if (t.length > 0) {
    data.tasks.unshift({
      id: uuidv4(), title: t.slice(0, 200), category: 'other',
      reward: data.settings.smallTaskReward, scheduledDate: today,
      completedAt: null, createdAt: now,
    });
    await save(userId, data);
    return [todoFlexMsg(data, today)];
  }
  return HELP;
}

// ── postback router (button taps) ────────────────────────────────

async function handlePostback(userId: string, dataStr: string): Promise<LineReturn> {
  const p = new URLSearchParams(dataStr);
  const a = p.get('a');
  const today = todayTaipei();

  if (a === 'help') return HELP;
  if (a === 'addhint') {
    return '✏️ 新增待辦：直接打字輸入事項即可，不用任何前綴。\n例如：讀書30分鐘\n\n加好後在卡片上點金額，即可切換 小/大任務。';
  }

  const data = await load(userId);
  const now = new Date().toISOString();
  const bal = () => data.transactions.reduce((s, tx) => s + tx.amount, 0);

  if (a === 'list') {
    if (materializeHabits(data, today)) await save(userId, data);
    return [todoFlexMsg(data, today)];
  }
  if (a === 'bank') return [bankFlexMsg(data)];
  if (a === 'wishes') return [wishesFlexMsg(data)];
  if (a === 'growth') return [growthFlexMsg(data)];
  if (a === 'projects') return [projectsFlexMsg(data)];

  if (a === 'nudge') {
    const k = p.get('k') as NudgeKey | null;
    if (k && ['morning', 'evening', 'streak', 'wish'].includes(k)) {
      data.settings.nudge = { ...(data.settings.nudge ?? {}), [k]: p.get('v') === '1' };
      await save(userId, data);
    }
    return [nudgeFlexMsg(data)];
  }
  if (a === 'habits') {
    if (materializeHabits(data, today)) await save(userId, data);
    return [habitsFlexMsg(data, today)];
  }

  if (a === 'done') {
    const task = data.tasks.find((t) => t.id === p.get('id'));
    if (!task) return '找不到這個待辦，可能已被刪除。';
    if (task.completedAt) return [todoFlexMsg(data, today)];
    task.completedAt = now;
    data.transactions.push({
      id: uuidv4(), type: 'task_complete', amount: task.reward,
      taskId: task.id, createdAt: now, note: task.title,
    });
    await save(userId, data);
    return [task.source?.type === 'habit' ? habitsFlexMsg(data, today) : todoFlexMsg(data, today)];
  }

  if (a === 'del') {
    const idx = data.tasks.findIndex((t) => t.id === p.get('id'));
    if (idx === -1) return [todoFlexMsg(data, today)];
    const task = data.tasks[idx];
    data.tasks.splice(idx, 1);
    if (task.completedAt) {
      // refund the deposit if it had been credited
      data.transactions.push({
        id: uuidv4(), type: 'task_revoke', amount: -task.reward,
        taskId: task.id, createdAt: now, note: task.title,
      });
    }
    await save(userId, data);
    return [todoFlexMsg(data, today)];
  }

  if (a === 'size') {
    const task = data.tasks.find((t) => t.id === p.get('id'));
    if (!task) return '找不到這個待辦。';
    // Only pending manual tasks toggle; completed tasks already recorded their reward.
    if (!task.completedAt && !task.source) {
      task.reward = task.reward >= data.settings.bigTaskReward
        ? data.settings.smallTaskReward
        : data.settings.bigTaskReward;
      await save(userId, data);
    }
    return [todoFlexMsg(data, today)];
  }

  if (a === 'pin') {
    const w = data.wishes.find((x) => x.id === p.get('id') && !x.redeemedAt);
    if (!w) return '找不到這個願望。';
    data.settings.pinnedWishId = w.id;
    await save(userId, data);
    return [bankFlexMsg(data)];
  }

  if (a === 'redeem') {
    const w = data.wishes.find((x) => x.id === p.get('id') && !x.redeemedAt);
    if (!w) return '找不到這個願望。';
    if (bal() < w.cost) return `餘額不足，無法兌換「${w.title}」\n還差 ${fmt(w.cost - bal())}`;
    w.redeemedAt = now;
    data.transactions.push({
      id: uuidv4(), type: 'wish_redeem', amount: -w.cost,
      wishId: w.id, createdAt: now, note: w.title,
    });
    if (data.settings.pinnedWishId === w.id) data.settings.pinnedWishId = null;
    await save(userId, data);
    return [wishesFlexMsg(data)];
  }

  return HELP;
}

// ── Vercel handler ───────────────────────────────────────────────

// LINE signature must be verified over the RAW request bytes, so we
// disable Vercel's automatic JSON body parser and read the stream.
export const config = { api: { bodyParser: false } };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readRawBody(req: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') { res.status(405).end(); return; }

  if (!CHANNEL_SECRET || !CHANNEL_ACCESS_TOKEN) {
    console.error('Missing LINE env vars', {
      hasSecret: !!CHANNEL_SECRET,
      hasToken: !!CHANNEL_ACCESS_TOKEN,
    });
    res.status(500).json({ error: 'server not configured' });
    return;
  }

  const signature = req.headers['x-line-signature'] as string | undefined;
  if (!signature) { res.status(401).end(); return; }

  const raw = await readRawBody(req);
  const hmac = createHmac('sha256', CHANNEL_SECRET).update(raw).digest('base64');

  const sigBuf = Buffer.from(signature);
  const hmacBuf = Buffer.from(hmac);
  if (
    sigBuf.length !== hmacBuf.length ||
    !timingSafeEqual(sigBuf, hmacBuf)
  ) {
    res.status(401).end();
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payload: any;
  try {
    payload = JSON.parse(raw.toString('utf8'));
  } catch {
    res.status(400).end();
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events: any[] = payload?.events ?? [];
  await Promise.all(
    events.map(async (e) => {
      try {
        if (e.type === 'message' && e.message?.type === 'text') {
          const ret = await handle(e.source.userId, e.message.text);
          await replyMessages(e.replyToken, normalize(ret));
        } else if (e.type === 'postback') {
          const ret = await handlePostback(e.source.userId, e.postback.data);
          await replyMessages(e.replyToken, normalize(ret));
        } else if (e.type === 'follow') {
          await replyMessages(e.replyToken, normalize(WELCOME));
        }
      } catch (err) {
        console.error('event error', err);
      }
    }),
  );

  res.status(200).json({ ok: true });
}
