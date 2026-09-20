import { formatDistanceToNow, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Check, ExternalLink, Plus, X } from 'lucide-react';
import {
  DOMAIN_LABEL,
  FACT_LABEL,
  type JarvisItem,
} from '@/lib/jarvis/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BriefingItemProps {
  item: JarvisItem;
  onAddTodo: (item: JarvisItem) => void;
  onDismiss: (item: JarvisItem) => void;
}

/** A "Top 3" briefing card: what happened · why it matters · action. */
export function BriefingItem({ item, onAddTodo, onDismiss }: BriefingItemProps) {
  const added = item.status === 'added';
  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1">
          {DOMAIN_LABEL[item.domain]} · {item.topic}
        </Badge>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {formatDistanceToNow(parseISO(item.publishedAt), {
            addSuffix: true,
            locale: zhTW,
          })}
        </span>
      </div>

      <h3 className="mt-2 text-[15px] font-semibold leading-snug">{item.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{item.whatHappened}</p>

      <div className="mt-3 rounded-xl bg-muted/40 p-3">
        <p className="text-xs font-medium text-foreground/80">為什麼對你重要</p>
        <p className="mt-1 text-sm">{item.whyItMatters}</p>
      </div>

      {item.action && (
        <div className="mt-2 flex items-start gap-1.5 text-sm text-primary">
          <span className="mt-px shrink-0 text-xs font-medium">建議行動</span>
          <span>{item.action.label}</span>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Badge variant="outline" className="border-border/70">
          {FACT_LABEL[item.factType]}
        </Badge>
        <span>來源 {item.source}</span>
        <span className="ml-auto">相關度 {item.relevance}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <ExternalLink className="h-4 w-4" />
          閱讀原文
        </a>
        <button
          type="button"
          onClick={() => onAddTodo(item)}
          disabled={added}
          className={cn(
            'flex min-h-9 flex-1 items-center justify-center gap-1 rounded-lg text-sm font-medium transition-colors',
            added
              ? 'cursor-default border border-border bg-muted/50 text-muted-foreground'
              : 'bg-primary text-primary-foreground active:scale-95',
          )}
        >
          {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {added ? '已加入待辦' : '加入待辦'}
        </button>
        <button
          type="button"
          onClick={() => onDismiss(item)}
          aria-label="忽略"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
