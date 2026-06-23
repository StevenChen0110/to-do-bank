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
interface Settings {
  smallTaskReward: number; bigTaskReward: number; soundEnabled: boolean;
  diaryCountsAsTask: boolean; pinnedWishId: string | null;
  customCategories: { id: string; label: string }[];
}
interface AppData {
  version: 1; tasks: Task[]; wishes: Wish[];
  transactions: Transaction[]; journalEntries: unknown[];
  habits: Habit[]; settings: Settings;
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

// ── LINE reply ───────────────────────────────────────────────────

async function reply(replyToken: string, text: string): Promise<void> {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] }),
  });
}

// ── command router ───────────────────────────────────────────────

const HELP = `📖 To Do Bank 指令

【待辦】
新增 [待辦] — 新增小任務
新增大 [待辦] — 新增大任務
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

async function handle(userId: string, text: string): Promise<string> {
  const t = text.trim();
  const today = todayTaipei();

  // 不需要讀資料的指令
  if (['說明', '?', '？', 'help'].includes(t)) return HELP;
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
    return `🔁 已建立每日習慣：${title}\n每天到「待辦」打勾，完成 +${fmt(reward)} 入帳`;
  }

  // ── 今日習慣 ────────────────────────────
  if (t === '習慣') {
    const list = data.habits.filter((h) => h.active);
    if (list.length === 0) {
      return '🔁 還沒有習慣\n\n輸入「習慣 新增 [名稱]」來建立每日習慣';
    }
    if (materializeHabits(data, today)) await save(userId, data);
    const weekday = weekdayOf(today);
    const lines = ['🔁 今日習慣', ''];
    for (const h of list) {
      const due = today >= h.startDate && h.weekdays.includes(weekday);
      const task = data.tasks.find(
        (x) => x.source?.type === 'habit' && x.source.refId === h.id && x.scheduledDate === today,
      );
      const doneToday = task?.completedAt != null;
      const mark = !due ? '😴' : doneToday ? '✅' : '⭕';
      lines.push(`${mark} ${h.title}　🔥${habitStreak(data, h.id, today)}`);
    }
    lines.push('', '完成請用：完成 [習慣名稱]');
    return lines.join('\n');
  }

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
    return `✅ 已新增大任務：${title}\n打勾完成後 +${fmt(reward)} 入帳`;
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
    return `✅ 已新增待辦：${title}\n打勾完成後 +${fmt(reward)} 入帳`;
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
    return `🎉 完成：${match.title}\n+${fmt(match.reward)} 已入帳！\n撲滿餘額：${fmt(bal())}`;
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
    return `🗑️ 已刪除：${task.title}`;
  }

  // ── 今日待辦 ────────────────────────────
  if (['待辦', '今日', '代辦'].includes(t)) {
    if (materializeHabits(data, today)) await save(userId, data);
    const todayTasks = data.tasks.filter(t => t.scheduledDate === today);
    if (todayTasks.length === 0)
      return `📋 今日（${today}）還沒有待辦\n\n輸入「新增 [待辦名稱]」來新增`;
    const pending = todayTasks.filter(t => t.completedAt === null);
    const done = todayTasks.filter(t => t.completedAt !== null);
    const earned = done.reduce((s, t) => s + t.reward, 0);
    const lines = [`📋 今日待辦 ${today}`, ''];
    pending.forEach(t => lines.push(`⭕ ${t.title}（+${fmt(t.reward)}）`));
    if (done.length > 0) {
      if (pending.length > 0) lines.push('');
      done.forEach(t => lines.push(`✅ ${t.title}（+${fmt(t.reward)}）`));
    }
    lines.push('', `今日入帳：${fmt(earned)}　${done.length}/${todayTasks.length} 完成`);
    return lines.join('\n');
  }

  // ── 撲滿 / 餘額 ─────────────────────────
  if (['撲滿', '餘額', '存款', '餘额'].includes(t)) {
    const balance = bal();
    const totalEarned = data.transactions.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
    const lines = [`🐷 撲滿餘額：${fmt(balance)}`, `累計獲得：${fmt(totalEarned)}`];
    const pinned = data.wishes.find(w => w.id === data.settings.pinnedWishId && !w.redeemedAt);
    if (pinned) {
      const pct = Math.min(100, Math.round((balance / pinned.cost) * 100));
      const shortfall = Math.max(0, pinned.cost - balance);
      lines.push('', `🎯 目標：${pinned.title}`, `進度：${pct}%（還差 ${fmt(shortfall)}）`);
    }
    return lines.join('\n');
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
    const pct = Math.min(100, Math.round((bal() / cost) * 100));
    return `🌟 已加入願望：${title}（${fmt(cost)}）\n目前進度：${pct}%`;
  }

  // ── 願望清單 ────────────────────────────
  if (t === '願望清單') {
    const active = data.wishes.filter(w => !w.redeemedAt);
    if (active.length === 0) return '🌟 還沒有願望\n\n輸入「願望 [名稱] [金額]」來新增';
    const balance = bal();
    const pinnedId = data.settings.pinnedWishId;
    const lines = ['🌟 願望清單', ''];
    active.forEach((w, i) => {
      const pct = Math.min(100, Math.round((balance / w.cost) * 100));
      const star = w.id === pinnedId ? '🎯 ' : '';
      const ok = balance >= w.cost ? '　✅ 可兌換' : '';
      lines.push(`${i + 1}. ${star}${w.title} — ${fmt(w.cost)}（${pct}%）${ok}`);
    });
    return lines.join('\n');
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
    const pct = Math.min(100, Math.round((bal() / wish.cost) * 100));
    return `🎯 已設為主目標：${wish.title}\n目前進度：${pct}%`;
  }
  if (t === '取消釘選') {
    data.settings.pinnedWishId = null;
    await save(userId, data);
    return '已取消主目標釘選';
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
    return `🎁 已兌換：${wish.title}（-${fmt(wish.cost)}）\n剩餘餘額：${fmt(bal())}`;
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
    return `🗑️ 已刪除願望：${w.title}`;
  }

  return `不認識這個指令。\n輸入「說明」查看所有指令。`;
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
    events
      .filter(e => e.type === 'message' && e.message?.type === 'text')
      .map(e => handle(e.source.userId, e.message.text)
        .then(text => reply(e.replyToken, text))
        .catch(err => console.error('handle error', err))),
  );

  res.status(200).json({ ok: true });
}
