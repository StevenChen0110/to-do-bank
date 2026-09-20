import { formatDistanceToNow, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Bookmark, Check, ExternalLink, Plus, X } from 'lucide-react';
import { DOMAIN_LABEL, type JarvisItem } from '@/lib/jarvis/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FeedItemProps {
  item: JarvisItem;
  onAddTodo: (item: JarvisItem) => void;
  onSave: (item: JarvisItem) => void;
  onDismiss: (item: JarvisItem) => void;
}

/** A compact feed row: Save · Add-to-todo · Read · Dismiss. */
export function FeedItem({ item, onAddTodo, onSave, onDismiss }: FeedItemProps) {
  const saved = item.status === 'saved';
  const added = item.status === 'added';
  return (
    <li className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          {DOMAIN_LABEL[item.domain]} · {item.topic}
        </Badge>
        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
          相關度 {item.relevance}
        </span>
      </div>
      <p className="mt-1.5 text-sm font-medium leading-snug">{item.title}</p>
      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
        {item.whyItMatters}
      </p>
      <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
        <span>{item.source}</span>
        <span>·</span>
        <span>
          {formatDistanceToNow(parseISO(item.publishedAt), {
            addSuffix: true,
            locale: zhTW,
          })}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onSave(item)}
            aria-label={saved ? '已儲存' : '儲存'}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-muted',
              saved ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <Bookmark className={cn('h-3.5 w-3.5', saved && 'fill-current')} />
          </button>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="閱讀原文"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button
            type="button"
            onClick={() => onAddTodo(item)}
            disabled={added}
            aria-label={added ? '已加入待辦' : '加入待辦'}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-muted',
              added ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {added ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => onDismiss(item)}
            aria-label="忽略"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </li>
  );
}
