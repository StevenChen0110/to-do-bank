import { useState } from 'react';
import { Briefcase, Check, Sparkles } from 'lucide-react';
import { ROLE_TEMPLATES, missingRoleCategories, type RoleTemplate } from '@/lib/workRoles';
import { allCategories } from '@/lib/categories';
import { useAppStore } from '@/store/useAppStore';
import { useReward } from '@/context/RewardContext';
import { cn } from '@/lib/utils';

interface WorkRoleSetupProps {
  /** Compact = inline switcher; false = full first-run chooser. */
  compact?: boolean;
  onDone?: () => void;
}

/**
 * 職能 template picker — the 80% default. Applying a role materialises its
 * category modules through the EXISTING addCategory(), then records which
 * category ids belong to 工作 so personal ones stay out of the work surface.
 * Projects are offered separately (opt-in) rather than force-created.
 */
export function WorkRoleSetup({ compact = false, onDone }: WorkRoleSetupProps) {
  const customCategories = useAppStore((s) => s.settings.customCategories);
  const workRole = useAppStore((s) => s.settings.workRole);
  const addCategory = useAppStore((s) => s.addCategory);
  const setWorkRole = useAppStore((s) => s.setWorkRole);
  const { showToast } = useReward();
  const [busy, setBusy] = useState<string | null>(null);

  const apply = (role: RoleTemplate) => {
    setBusy(role.id);
    // Create any missing category modules via the existing system.
    for (const label of missingRoleCategories(role, allCategories(customCategories))) {
      addCategory(label);
    }
    // Re-read so newly created ids are included.
    const after = allCategories(useAppStore.getState().settings.customCategories);
    const ids = role.categories
      .map((label) => after.find((c) => c.label === label)?.id)
      .filter(Boolean) as string[];
    setWorkRole(role.id, ids);
    setBusy(null);
    showToast(`已套用「${role.label}」模板`, 'success', `${ids.length} 個分類模組已就緒`);
    onDone?.();
  };

  return (
    <div className={cn('flex flex-col gap-3', !compact && 'py-2')}>
      {!compact && (
        <header className="text-center">
          <Briefcase className="mx-auto h-7 w-7 text-primary" />
          <h2 className="mt-2 text-lg font-semibold">你的職能是？</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            選一個，工作區會自動帶入對應的分類模組與專案範本。之後都能自行增修。
          </p>
        </header>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ROLE_TEMPLATES.map((role) => {
          const active = workRole === role.id;
          return (
            <button
              key={role.id}
              type="button"
              disabled={busy !== null}
              onClick={() => apply(role)}
              className={cn(
                'rounded-xl border p-3 text-left transition-colors disabled:opacity-60',
                active
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-primary/40',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{role.label}</span>
                {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{role.hint}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {role.categories.slice(0, 3).map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {c}
                  </span>
                ))}
                {role.categories.length > 3 && (
                  <span className="self-center text-[10px] text-muted-foreground">
                    +{role.categories.length - 3}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {!compact && (
        <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          80% 由模板預設，20% 你自己調整
        </p>
      )}
    </div>
  );
}
