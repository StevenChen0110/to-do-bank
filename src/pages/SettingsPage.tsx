import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  clampReward,
  parseRewardInput,
  REWARD_MAX,
  REWARD_MIN,
} from '@/lib/settings';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SettingsPage() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [smallDraft, setSmallDraft] = useState(String(settings.smallTaskReward));
  const [bigDraft, setBigDraft] = useState(String(settings.bigTaskReward));
  const [hint, setHint] = useState<string | null>(null);

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
            onChange={(e) =>
              updateSettings({ soundEnabled: e.target.checked })
            }
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
        <label
          className={cn(
            'mt-3 flex cursor-pointer items-center justify-between gap-3',
          )}
        >
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

      <p className="text-center text-xs text-muted-foreground">
        釘選願望請至「願望」分頁管理。
      </p>
    </div>
  );
}
