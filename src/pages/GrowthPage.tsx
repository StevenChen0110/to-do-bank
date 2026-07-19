import { useState } from 'react';
import { FolderKanban, Repeat } from 'lucide-react';
import { HabitsPage } from '@/pages/HabitsPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { cn } from '@/lib/utils';

type GrowthView = 'habit' | 'project';

/** 養成：把「習慣」與「專案」收進同一分頁，上方切換。 */
export function GrowthPage() {
  const [view, setView] = useState<GrowthView>('habit');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 rounded-xl border border-border bg-card p-1" role="group" aria-label="養成模式">
        {(
          [
            { id: 'habit', label: '習慣', icon: Repeat, hint: '每日重複養成' },
            { id: 'project', label: '專案', icon: FolderKanban, hint: '目標拆步驟' },
          ] as const
        ).map(({ id, label, icon: Icon, hint }) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            aria-pressed={view === id}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              view === id
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
            <span className="hidden text-[10px] font-normal opacity-70 sm:inline">· {hint}</span>
          </button>
        ))}
      </div>

      {view === 'habit' ? <HabitsPage /> : <ProjectsPage />}
    </div>
  );
}
