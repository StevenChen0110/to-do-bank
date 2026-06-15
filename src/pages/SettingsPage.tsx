import { useState } from 'react';
import { Check, LogOut, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/context/AuthContext';
import {
  clampReward,
  parseRewardInput,
  REWARD_MAX,
  REWARD_MIN,
} from '@/lib/settings';
import { BUILTIN_CATEGORIES } from '@/lib/categories';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SettingsPage() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const addCategory = useAppStore((s) => s.addCategory);
  const deleteCategory = useAppStore((s) => s.deleteCategory);
  const { user, linkedLineId, linkLine, signOut } = useAuth();

  const [smallDraft, setSmallDraft] = useState(String(settings.smallTaskReward));
  const [bigDraft, setBigDraft] = useState(String(settings.bigTaskReward));
  const [hint, setHint] = useState<string | null>(null);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [pairCode, setPairCode] = useState('');
  const [linkMsg, setLinkMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [linking, setLinking] = useState(false);

  const handleLink = async () => {
    if (!pairCode.trim()) return;
    setLinking(true);
    setLinkMsg(null);
    const { error } = await linkLine(pairCode);
    setLinking(false);
    if (error) {
      setLinkMsg({ ok: false, text: error });
    } else {
      setPairCode('');
      setLinkMsg({ ok: true, text: '已連結 LINE，資料將與手機同步！' });
    }
  };

  const commitRewards = () => {
    const small = parseRewardInput(smallDraft);
    const big = parseRewardInput(bigDraft);
    if (small === null || big === null) {
      setHint(`請輸入 ${REWARD_MIN}～${REWARD_MAX} 的正整數`);
      return;
    }
    if (big < small) {
      setHint('大任務獎勵應大於或等於小任務');
      return;
    }
    updateSettings({
      smallTaskReward: clampReward(small),
      bigTaskReward: clampReward(big),
    });
    setSmallDraft(String(clampReward(small)));
    setBigDraft(String(clampReward(big)));
    setHint('已儲存獎勵設定');
    window.setTimeout(() => setHint(null), 2000);
  };

  const handleAddCategory = () => {
    const trimmed = newCatLabel.trim();
    if (!trimmed) return;
    addCategory(trimmed);
    setNewCatLabel('');
  };

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">任務獎勵</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          僅影響之後新增的小／大任務與日記入帳金額（{REWARD_MIN}～{REWARD_MAX}）。
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs">
            小任務（元）
            <Input
              inputMode="numeric"
              value={smallDraft}
              onChange={(e) => setSmallDraft(e.target.value)}
              aria-label="小任務獎勵"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            大任務（元）
            <Input
              inputMode="numeric"
              value={bigDraft}
              onChange={(e) => setBigDraft(e.target.value)}
              aria-label="大任務獎勵"
            />
          </label>
        </div>
        <Button type="button" className="mt-3 w-full" onClick={commitRewards}>
          儲存獎勵
        </Button>
        {hint && (
          <p className="mt-2 text-xs text-muted-foreground" role="status">
            {hint}
          </p>
        )}
      </section>

      {/* ── 分類標籤 ──────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">分類標籤</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          預設分類無法刪除；自訂分類可新增與刪除。
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {BUILTIN_CATEGORIES.map(({ id, label }) => (
            <span
              key={id}
              className="rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground"
            >
              {label}
            </span>
          ))}
          {settings.customCategories.map(({ id, label }) => (
            <span
              key={id}
              className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/5 py-1 pl-3 pr-1.5 text-xs text-primary"
            >
              {label}
              <button
                type="button"
                onClick={() => deleteCategory(id)}
                aria-label={`刪除分類 ${label}`}
                className="rounded-full p-0.5 transition-colors hover:bg-primary/20"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <Input
            value={newCatLabel}
            onChange={(e) => setNewCatLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleAddCategory();
              }
            }}
            placeholder="輸入新分類名稱"
            maxLength={20}
            className="h-9 flex-1 text-sm"
            aria-label="新分類名稱"
          />
          <Button
            type="button"
            size="sm"
            className={cn('h-9 shrink-0', !newCatLabel.trim() && 'opacity-50')}
            onClick={handleAddCategory}
            disabled={!newCatLabel.trim()}
          >
            新增
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">音效</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          預設為關閉。開啟後，完成任務入帳時會播放短促「叮」聲（需在你點擊送出時觸發，以符合
          iOS 政策）。
        </p>
        <label className="mt-3 flex cursor-pointer items-center justify-between gap-3">
          <span className="text-sm">入帳音效</span>
          <input
            type="checkbox"
            checked={settings.soundEnabled}
            onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
            className="h-5 w-5 accent-primary"
            aria-label="入帳音效開關"
          />
        </label>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">日記</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          開啟後，在所選日期首次儲存非空日記時，會以「日記完成」入帳一次小任務獎勵（同日不重複）。
        </p>
        <label className="mt-3 flex cursor-pointer items-center justify-between gap-3">
          <span className="text-sm">日記完成算任務</span>
          <input
            type="checkbox"
            checked={settings.diaryCountsAsTask}
            onChange={(e) =>
              updateSettings({ diaryCountsAsTask: e.target.checked })
            }
            className="h-5 w-5 accent-primary"
            aria-label="日記完成算任務"
          />
        </label>
      </section>

      {/* ── 連結 LINE ─────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">連結 LINE</h2>
        {linkedLineId ? (
          <div className="mt-2 flex items-center gap-2 text-sm text-primary">
            <Check className="h-4 w-4" />
            已連結 LINE，資料與手機 Bot 同步中
          </div>
        ) : (
          <>
            <p className="mt-1 text-xs text-muted-foreground">
              在 LINE 跟 Bot 輸入「綁定」取得配對碼，貼到下方即可與手機同步同一份資料。
            </p>
            <div className="mt-3 flex gap-2">
              <Input
                value={pairCode}
                onChange={(e) => setPairCode(e.target.value)}
                placeholder="輸入配對碼，例如 A3F9K2"
                maxLength={8}
                className="h-9 flex-1 text-sm uppercase"
                aria-label="LINE 配對碼"
              />
              <Button
                type="button"
                size="sm"
                className="h-9 shrink-0"
                onClick={handleLink}
                disabled={linking || !pairCode.trim()}
              >
                {linking ? '連結中…' : '連結'}
              </Button>
            </div>
          </>
        )}
        {linkMsg && (
          <p
            className={cn(
              'mt-2 text-xs',
              linkMsg.ok ? 'text-primary' : 'text-red-500',
            )}
            role="status"
          >
            {linkMsg.text}
          </p>
        )}
      </section>

      {/* ── 帳號 ─────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">帳號</h2>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {user?.email ?? '已登入'}
        </p>
        <Button
          type="button"
          variant="ghost"
          className="mt-3 w-full justify-center text-muted-foreground"
          onClick={() => void signOut()}
        >
          <LogOut className="h-4 w-4" />
          登出
        </Button>
      </section>

      <p className="text-center text-xs text-muted-foreground">
        釘選願望請至「願望」分頁管理。
      </p>
    </div>
  );
}
