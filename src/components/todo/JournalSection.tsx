import { useEffect, useRef, useState } from 'react';
import { format, parse } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useReward } from '@/context/RewardContext';
import { findJournalByDate, isJournalCredited } from '@/lib/journal';
import { playDepositChime, unlockAudioFromGesture } from '@/lib/sound';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface JournalSectionProps {
  dateKey: string;
}

const DEBOUNCE_MS = 500;

export function JournalSection({ dateKey }: JournalSectionProps) {
  const journalEntries = useAppStore((s) => s.journalEntries);
  const tasks = useAppStore((s) => s.tasks);
  const diaryCountsAsTask = useAppStore((s) => s.settings.diaryCountsAsTask);
  const soundEnabled = useAppStore((s) => s.settings.soundEnabled);
  const smallReward = useAppStore((s) => s.settings.smallTaskReward);
  const saveJournalContent = useAppStore((s) => s.saveJournalContent);
  const { showToast } = useReward();

  const stored = findJournalByDate(journalEntries, dateKey);
  const [content, setContent] = useState(stored?.content ?? '');
  const [expanded, setExpanded] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const lastSavedRef = useRef(stored?.content ?? '');

  const dateLabel = format(
    parse(dateKey, 'yyyy-MM-dd', new Date()),
    'M月d日',
    { locale: zhTW },
  );

  useEffect(() => {
    const entry = findJournalByDate(
      useAppStore.getState().journalEntries,
      dateKey,
    );
    const next = entry?.content ?? '';
    setContent(next);
    lastSavedRef.current = next;
    setSaveState('idle');
    setExpanded(false);
  }, [dateKey]);

  const showCredited = isJournalCredited(
    findJournalByDate(journalEntries, dateKey),
    tasks,
  );

  const hasContent = content.trim().length > 0;

  useEffect(() => {
    if (!expanded) {
      return;
    }
    const timer = window.setTimeout(() => {
      if (content === lastSavedRef.current) {
        return;
      }
      unlockAudioFromGesture();
      setSaveState('saving');
      const { creditedAmount } = saveJournalContent(dateKey, content);
      lastSavedRef.current = content;
      setSaveState('saved');

      if (creditedAmount != null) {
        if (soundEnabled) {
          playDepositChime();
        }
        showToast(`日記完成 +NT$${creditedAmount} 已入帳`, 'success');
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [content, dateKey, expanded, saveJournalContent, soundEnabled, showToast]);

  const toggleLabel = hasContent
    ? `編輯${dateLabel}日記`
    : `寫${dateLabel}日記`;

  return (
    <div className="rounded-lg border border-dashed border-border/80 bg-muted/30 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 gap-1.5 px-2 text-xs font-medium"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
          {expanded ? '收合日記' : hasContent ? '+ 記錄想法' : toggleLabel}
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </Button>
        <div className="flex items-center gap-2">
          {showCredited && (
            <Badge variant="default" className="text-[10px]">
              已入帳 +{smallReward}
            </Badge>
          )}
          {saveState === 'saving' && expanded && (
            <span className="text-[10px] text-muted-foreground">儲存中…</span>
          )}
          {saveState === 'saved' && expanded && !showCredited && (
            <span className="text-[10px] text-muted-foreground">已儲存</span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-2 space-y-2 border-t border-border/60 pt-2">
          {diaryCountsAsTask && !showCredited && (
            <p className="text-[11px] text-muted-foreground">
              儲存後將以「日記完成」入帳小任務獎勵（{smallReward} 元），同日僅一次。
            </p>
          )}
          {!diaryCountsAsTask && (
            <p className="text-[11px] text-muted-foreground">
              僅記錄心情，不入帳。可在設定開啟「日記完成算任務」。
            </p>
          )}
          <textarea
            value={content}
            onChange={(e) => {
              setSaveState('idle');
              setContent(e.target.value);
            }}
            placeholder="寫下今天的心情與收穫…"
            rows={3}
            maxLength={4000}
            className={cn(
              'w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm',
              'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
            aria-label={`${dateLabel}日記內容`}
          />
        </div>
      )}
    </div>
  );
}
