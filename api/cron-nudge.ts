// Daily nudge push. Triggered by Vercel Cron (see vercel.json) twice a day:
//   00:00 UTC = 08:00 Taipei → morning;  13:00 UTC = 21:00 Taipei → evening.
// Evening folds in streak-rescue + wish-proximity. Prefs live in
// user_data.settings.nudge; idempotency via lastMorning / lastEvening.
// Manual test:  /api/cron-nudge?key=tdbk-setup&slot=evening&dry=1
import { createClient } from '@supabase/supabase-js';

const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!;
const MANUAL_KEY = 'tdbk-setup';
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!,
);

// ── time (Asia/Taipei = UTC+8) ──
function taipeiNow(): Date { return new Date(Date.now() + 8 * 3600 * 1000); }
function todayTaipei(): string { return taipeiNow().toISOString().slice(0, 10); }
function taipeiHour(): number { return taipeiNow().getUTCHours(); }
function shiftDay(key: string, delta: number): string {
  const x = new Date(`${key}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + delta);
  return x.toISOString().slice(0, 10);
}
function weekdayOf(key: string): number { return new Date(`${key}T00:00:00Z`).getUTCDay(); }
function fmt(n: number): string { return `NT$${Math.round(n).toLocaleString()}`; }

// ── data subset ──
interface Task { id: string; title: string; reward: number; scheduledDate: string; completedAt: string | null; source?: { type: string; refId: string }; }
interface Habit { id: string; title: string; weekdays: number[]; startDate: string; active: boolean; }
interface Wish { id: string; title: string; cost: number; redeemedAt: string | null; }
interface Nudge { morning?: boolean; evening?: boolean; streak?: boolean; wish?: boolean; lastMorning?: string; lastEvening?: string; }
interface Settings { pinnedWishId: string | null; bigTaskReward: number; smallTaskReward: number; nudge?: Nudge; }
interface AppData { tasks: Task[]; habits: Habit[]; wishes: Wish[]; transactions: { amount: number }[]; settings: Settings; }

function streakOf(tasks: Task[], habitId: string, today: string): number {
  const done = new Set(
    tasks.filter((t) => t.source?.type === 'habit' && t.source.refId === habitId && t.completedAt).map((t) => t.scheduledDate),
  );
  let s = 0;
  let cur = done.has(today) ? today : shiftDay(today, -1);
  while (done.has(cur)) { s += 1; cur = shiftDay(cur, -1); }
  return s;
}

function balance(d: AppData): number { return d.transactions.reduce((s, tx) => s + tx.amount, 0); }
function isEmpty(d: AppData): boolean {
  return d.tasks.length === 0 && d.habits.length === 0 && d.wishes.length === 0 && d.transactions.length === 0;
}

async function push(userId: string, text: string): Promise<void> {
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}` },
    body: JSON.stringify({ to: userId, messages: [{ type: 'text', text }] }),
  });
}

function morningText(d: AppData, today: string): string {
  const pending = d.tasks.filter((t) => t.scheduledDate === today && !t.completedAt);
  if (pending.length === 0) {
    return '☀️ 早安！今天還沒排待辦。想到什麼就打一句記下來，完成就存進撲滿 🐷';
  }
  const top = pending.slice(0, 3).map((t) => `・${t.title}`).join('\n');
  const more = pending.length > 3 ? `\n…還有 ${pending.length - 3} 件` : '';
  return `☀️ 早安！今天排了 ${pending.length} 件：\n${top}${more}\n\n完成就入帳 🐷 打「待辦」開始`;
}

function eveningText(d: AppData, today: string, n: Nudge): string | null {
  const sections: string[] = [];

  if (n.evening !== false) {
    const todays = d.tasks.filter((t) => t.scheduledDate === today);
    const done = todays.filter((t) => t.completedAt);
    const earned = done.reduce((s, t) => s + t.reward, 0);
    const pending = todays.filter((t) => !t.completedAt);
    let s = `🌙 今天 +${fmt(earned)}，完成 ${done.length}/${todays.length} 🎉`;
    if (pending.length > 0) {
      s += `\n還沒打勾：${pending.slice(0, 3).map((t) => t.title).join('、')}${pending.length > 3 ? '…' : ''}\n打「待辦」一鍵完成`;
    }
    sections.push(s);
  }

  if (n.streak !== false) {
    const weekday = weekdayOf(today);
    const atRisk = d.habits.filter((h) => {
      if (!h.active || today < h.startDate || !h.weekdays.includes(weekday)) return false;
      const doneToday = d.tasks.some((t) => t.source?.type === 'habit' && t.source.refId === h.id && t.scheduledDate === today && t.completedAt);
      return !doneToday && streakOf(d.tasks, h.id, today) >= 3;
    });
    if (atRisk.length > 0) {
      sections.push('🔥 別斷鏈！這些習慣今天還沒打勾：\n' + atRisk.map((h) => `・${h.title}（連續 ${streakOf(d.tasks, h.id, today)} 天）`).join('\n'));
    }
  }

  if (n.wish !== false) {
    const pinned = d.wishes.find((w) => w.id === d.settings.pinnedWishId && !w.redeemedAt);
    if (pinned) {
      const bal = balance(d);
      const shortfall = pinned.cost - bal;
      if (shortfall > 0 && bal >= pinned.cost * 0.8) {
        sections.push(`🎁 再 ${fmt(shortfall)} 就能兌換「${pinned.title}」了，衝一下！`);
      }
    }
  }

  return sections.length ? sections.join('\n\n') : null;
}

async function markSent(userId: string, d: AppData, key: 'lastMorning' | 'lastEvening', today: string): Promise<void> {
  d.settings.nudge = { ...(d.settings.nudge ?? {}), [key]: today };
  await supabase.from('user_data').upsert({ user_id: userId, data: d, updated_at: new Date().toISOString() });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  // Vercel Cron adds `Authorization: Bearer <CRON_SECRET>` when that env is set.
  const secret = process.env.CRON_SECRET;
  const authed = secret ? req.headers['authorization'] === `Bearer ${secret}` : true;
  const manual = req.query?.key === MANUAL_KEY;
  if (!authed && !manual) { res.status(401).json({ error: 'unauthorized' }); return; }
  if (!CHANNEL_ACCESS_TOKEN) { res.status(500).json({ error: 'no token' }); return; }

  const today = todayTaipei();
  const hour = taipeiHour();
  let slot = (req.query?.slot as string) || '';
  if (!slot) slot = hour >= 6 && hour < 12 ? 'morning' : hour >= 18 && hour < 24 ? 'evening' : '';
  if (slot !== 'morning' && slot !== 'evening') {
    res.status(200).json({ skipped: `taipei hour ${hour} is not a nudge slot` });
    return;
  }
  const dry = req.query?.dry === '1';

  const { data: rows, error } = await supabase.from('user_data').select('user_id, data').like('user_id', 'U%');
  if (error) { res.status(500).json({ error: error.message }); return; }

  let sent = 0;
  let skipped = 0;
  const log: string[] = [];

  for (const row of rows ?? []) {
    const userId = row.user_id as string;
    const d = row.data as AppData;
    if (!d || !d.settings || isEmpty(d)) { skipped += 1; continue; }
    const n: Nudge = d.settings.nudge ?? {};

    if (slot === 'morning') {
      if (n.morning === false || n.lastMorning === today) { skipped += 1; continue; }
      const text = morningText(d, today);
      if (!dry) { await push(userId, text); await markSent(userId, d, 'lastMorning', today); }
      sent += 1; log.push(`${userId.slice(0, 8)}… morning`);
    } else {
      if ((n.evening === false && n.streak === false && n.wish === false) || n.lastEvening === today) { skipped += 1; continue; }
      const text = eveningText(d, today, n);
      if (!text) { skipped += 1; continue; }
      if (!dry) { await push(userId, text); await markSent(userId, d, 'lastEvening', today); }
      sent += 1; log.push(`${userId.slice(0, 8)}… evening`);
    }
  }

  res.status(200).json({ slot, today, sent, skipped, dry, log });
}
