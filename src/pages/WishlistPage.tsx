import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Compass, Heart, Search, Sparkles, Trophy, Wallet } from 'lucide-react';
import { getDailyEarnRate } from '@/lib/calculations';
import { formatCurrency } from '@/lib/format';
import { WishThumb } from '@/components/wish/WishThumb';
import {
  SHOP_CATEGORIES,
  recommendProducts,
  shopSearchUrl,
  type ShopProduct,
} from '@/lib/shopCatalog';
import { useBalance } from '@/hooks/useBalance';
import { useAppStore } from '@/store/useAppStore';
import { useReward } from '@/context/RewardContext';
import type { Wish } from '@/types';
import { ProductCard } from '@/components/wish/ProductCard';
import { RecommendCard } from '@/components/wish/RecommendCard';
import { WishFormDialog } from '@/components/wish/WishFormDialog';
import { RedeemConfirmDialog } from '@/components/wish/RedeemConfirmDialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type ShopTab = 'discover' | 'mine';

export function WishlistPage() {
  const wishes = useAppStore((s) => s.wishes);
  const transactions = useAppStore((s) => s.transactions);
  const shopPreferences = useAppStore((s) => s.settings.shopPreferences);
  const addWish = useAppStore((s) => s.addWish);
  const redeemWish = useAppStore((s) => s.redeemWish);
  const deleteWish = useAppStore((s) => s.deleteWish);
  const setShopPreferences = useAppStore((s) => s.setShopPreferences);
  const pinnedWishId = useAppStore((s) => s.settings.pinnedWishId);
  const setPinnedWishId = useAppStore((s) => s.setPinnedWishId);
  const { balance } = useBalance();
  const { showToast } = useReward();

  const [tab, setTab] = useState<ShopTab>('discover');
  const [query, setQuery] = useState('');
  const [affordableOnly, setAffordableOnly] = useState(false);
  const [redeemTarget, setRedeemTarget] = useState<Wish | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Stable identity so the recommendations memo doesn't re-run every render.
  const prefs = useMemo(() => shopPreferences ?? [], [shopPreferences]);
  const dailyRate = useMemo(() => getDailyEarnRate(transactions), [transactions]);

  const active = useMemo(() => wishes.filter((w) => w.redeemedAt === null), [wishes]);
  const redeemed = useMemo(
    () =>
      wishes
        .filter((w) => w.redeemedAt !== null)
        .sort((a, b) => (b.redeemedAt ?? '').localeCompare(a.redeemedAt ?? '')),
    [wishes],
  );
  const affordableCount = active.filter((w) => balance >= w.cost).length;
  const activeTitles = useMemo(
    () => new Set(active.map((w) => w.title)),
    [active],
  );

  const recommendations = useMemo(
    () => recommendProducts(prefs, query),
    [prefs, query],
  );

  const shelf = useMemo(() => {
    const list = affordableOnly ? active.filter((w) => balance >= w.cost) : active;
    return [...list].sort((a, b) => {
      if (a.id === pinnedWishId && b.id !== pinnedWishId) return -1;
      if (b.id === pinnedWishId && a.id !== pinnedWishId) return 1;
      const aa = balance >= a.cost ? 0 : 1;
      const ba = balance >= b.cost ? 0 : 1;
      if (aa !== ba) return aa - ba;
      return a.cost - b.cost;
    });
  }, [active, affordableOnly, balance, pinnedWishId]);

  const togglePref = (id: string) =>
    setShopPreferences(
      prefs.includes(id) ? prefs.filter((x) => x !== id) : [...prefs, id],
    );

  const addFromCatalog = (p: ShopProduct) => {
    addWish({ title: p.name, cost: p.price, productUrl: shopSearchUrl(p.name) });
    showToast(`已加入願望「${p.name}」`, 'success', '完成待辦存錢，存夠就能入手');
  };

  const handleBuy = (wish: Wish) => {
    setRedeemTarget(wish);
    setConfirmOpen(true);
  };
  const handleConfirmBuy = () => {
    if (!redeemTarget) return;
    redeemWish(redeemTarget.id);
    showToast(`🎉 已入手「${redeemTarget.title}」`, 'success', '祝你享受這份獎勵！');
  };
  const handleTogglePin = (wishId: string) => {
    const next = pinnedWishId === wishId ? null : wishId;
    setPinnedWishId(next);
    const wish = wishes.find((w) => w.id === wishId);
    showToast(
      next ? `已釘選「${wish?.title ?? ''}」為主目標` : '已取消主目標釘選',
      'info',
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 錢包 */}
      <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-card p-4">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Wallet className="h-4 w-4" />
          錢包餘額（可花）
        </div>
        <p className="mt-1 text-3xl font-bold tracking-tight">{formatCurrency(balance)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {affordableCount > 0
            ? `願望裡有 ${affordableCount} 樣你買得起了 🛒`
            : '完成待辦累積存款，就能把想要的帶回家。'}
        </p>
      </section>

      {/* 分頁 */}
      <div className="flex gap-2 rounded-xl border border-border bg-card p-1" role="group" aria-label="商店分頁">
        {(
          [
            { id: 'discover', label: '探索推薦', icon: Compass },
            { id: 'mine', label: `我的願望${active.length > 0 ? ` ${active.length}` : ''}`, icon: Heart },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              tab === id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'discover' ? (
        <>
          {/* 喜好 */}
          <div>
            <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              選你的喜好，推薦更準
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SHOP_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => togglePref(c.id)}
                  aria-pressed={prefs.includes(c.id)}
                  className={cn(
                    'flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                    prefs.includes(c.id)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  <span aria-hidden>{c.emoji}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* 搜尋 */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜尋想要的東西…"
              className="pl-8"
              aria-label="搜尋商品"
            />
          </div>

          {/* 推薦清單 */}
          {recommendations.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              {query ? '找不到相符的東西，換個關鍵字試試。' : '選幾個喜好，看看推薦給你的獎勵。'}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {recommendations.map((p) => (
                <RecommendCard
                  key={p.id}
                  product={p}
                  added={activeTitles.has(p.name)}
                  affordable={balance >= p.price}
                  onAdd={addFromCatalog}
                />
              ))}
            </div>
          )}

          <p className="text-center text-[11px] text-muted-foreground/70">
            找不到想要的？
            <span className="mx-1">·</span>
            <span className="inline-flex align-middle">
              <WishFormDialog />
            </span>
          </p>
        </>
      ) : (
        <>
          {/* 我的願望控制列 */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setAffordableOnly((v) => !v)}
              aria-pressed={affordableOnly}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                affordableOnly
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              只看買得起{affordableCount > 0 ? ` ${affordableCount}` : ''}
            </button>
            <WishFormDialog />
          </div>

          {shelf.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              {affordableOnly
                ? '目前還沒有買得起的東西，再完成幾件待辦吧。'
                : '還沒有願望，去「探索推薦」挑一個想要的，或自己新增。'}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {shelf.map((wish) => (
                <ProductCard
                  key={wish.id}
                  wish={wish}
                  balance={balance}
                  dailyRate={dailyRate}
                  isPinned={pinnedWishId === wish.id}
                  onBuy={handleBuy}
                  onDelete={deleteWish}
                  onTogglePin={handleTogglePin}
                />
              ))}
            </div>
          )}

          {/* 已購入櫃 */}
          {redeemed.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
                <Trophy className="h-4 w-4 text-amber-500" />
                已入手
                <span className="text-xs font-normal text-muted-foreground">
                  {redeemed.length} 件
                </span>
              </h2>
              <ul className="flex flex-wrap gap-2">
                {redeemed.map((wish) => (
                  <li
                    key={wish.id}
                    className="flex items-center gap-2 rounded-full border border-border bg-muted/40 py-1 pl-1.5 pr-3"
                  >
                    <WishThumb
                      title={wish.title}
                      imageUrl={wish.imageUrl}
                      className="h-6 w-6 rounded-full"
                      emojiClassName="text-lg"
                    />
                    <span className="text-sm font-medium">{wish.title}</span>
                    {wish.redeemedAt && (
                      <span className="text-[11px] text-muted-foreground">
                        {format(parseISO(wish.redeemedAt), 'M/d')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <RedeemConfirmDialog
        wish={redeemTarget}
        balance={balance}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirmBuy}
      />
    </div>
  );
}
