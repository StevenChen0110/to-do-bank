import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import type { JarvisProfile } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const EMPTY: JarvisProfile = {
  interests: [],
  watchlist: [],
  markets: [],
  careerRoles: [],
  industries: [],
  projects: [],
  companies: [],
};

function TagField({
  label,
  hint,
  values,
  placeholder,
  onChange,
}: {
  label: string;
  hint?: string;
  values: string[];
  placeholder: string;
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v || values.includes(v)) {
      setDraft('');
      return;
    }
    onChange([...values, v]);
    setDraft('');
  };
  const remove = (v: string) => onChange(values.filter((x) => x !== v));

  return (
    <div>
      <label className="text-xs font-medium text-foreground/80">{label}</label>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span
            key={v}
            className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 py-1 pl-2.5 pr-1.5 text-xs font-medium text-primary"
          >
            {v}
            <button
              type="button"
              onClick={() => remove(v)}
              aria-label={`移除 ${v}`}
              className="rounded-full p-0.5 hover:bg-primary/10"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder={placeholder}
        className="mt-1.5 h-9 text-sm"
      />
    </div>
  );
}

/** Edits the JARVIS personal-context profile (lives in synced settings). */
export function JarvisProfileEditor() {
  const profile = useAppStore((s) => s.settings.jarvis) ?? EMPTY;
  const setJarvisProfile = useAppStore((s) => s.setJarvisProfile);
  const patch = (p: Partial<JarvisProfile>) =>
    setJarvisProfile({ ...EMPTY, ...profile, ...p });

  const risks: { id: NonNullable<JarvisProfile['riskPreference']>; label: string }[] = [
    { id: 'low', label: '保守' },
    { id: 'medium', label: '中等' },
    { id: 'high', label: '積極' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <TagField
        label="興趣主題"
        hint="JARVIS 會優先推播與這些主題相關的資訊"
        values={profile.interests}
        placeholder="輸入後按 Enter，如：AI、產品管理"
        onChange={(v) => patch({ interests: v })}
      />
      <TagField
        label="投資觀察清單"
        hint="股票／ETF 代號"
        values={profile.watchlist}
        placeholder="如：TSM、NVDA、0050"
        onChange={(v) => patch({ watchlist: v })}
      />
      <TagField
        label="關注市場"
        values={profile.markets}
        placeholder="如：台股、美股"
        onChange={(v) => patch({ markets: v })}
      />
      <div>
        <label className="text-xs font-medium text-foreground/80">風險偏好</label>
        <div className="mt-1.5 flex gap-2">
          {risks.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => patch({ riskPreference: r.id })}
              aria-pressed={profile.riskPreference === r.id}
              className={cn(
                'flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                profile.riskPreference === r.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <TagField
        label="職涯方向"
        values={profile.careerRoles}
        placeholder="如：Product Manager、GTM"
        onChange={(v) => patch({ careerRoles: v })}
      />
      <TagField
        label="關注產業"
        values={profile.industries}
        placeholder="如：科技、消費電子"
        onChange={(v) => patch({ industries: v })}
      />
      <TagField
        label="進行中的專案"
        hint="與這些專案相關的競品、工具、市場變化會被優先追蹤"
        values={profile.projects}
        placeholder="輸入專案名稱"
        onChange={(v) => patch({ projects: v })}
      />
      <TagField
        label="重要公司"
        values={profile.companies}
        placeholder="如：OpenAI、Nvidia、台積電"
        onChange={(v) => patch({ companies: v })}
      />
    </div>
  );
}
