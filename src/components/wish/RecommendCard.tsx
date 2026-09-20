import { Check, ExternalLink, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { shopSearchUrl, type ShopProduct } from '@/lib/shopCatalog';
import { cn } from '@/lib/utils';

interface RecommendCardProps {
  product: ShopProduct;
  /** True if this product is already in the user's wishes. */
  added: boolean;
  /** Wallet can already afford it. */
  affordable: boolean;
  onAdd: (product: ShopProduct) => void;
}

/** A catalog product recommended as a reward — add it as a wish to save toward. */
export function RecommendCard({ product, added, affordable, onAdd }: RecommendCardProps) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl" aria-hidden>
          {product.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium leading-tight">{product.name}</h3>
          <p className="mt-0.5 text-sm font-semibold">{formatCurrency(product.price)}</p>
          <a
            href={shopSearchUrl(product.name)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] text-muted-foreground transition-colors hover:text-primary"
          >
            逛逛
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        {affordable && !added && (
          <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
            買得起
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => !added && onAdd(product)}
        disabled={added}
        className={cn(
          'mt-2.5 flex min-h-9 w-full items-center justify-center gap-1 rounded-lg text-sm font-medium transition-colors',
          added
            ? 'cursor-default border border-border bg-muted/50 text-muted-foreground'
            : 'bg-primary text-primary-foreground active:scale-95',
        )}
      >
        {added ? (
          <>
            <Check className="h-4 w-4" />
            已加入願望
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" />
            加入願望
          </>
        )}
      </button>
    </div>
  );
}
