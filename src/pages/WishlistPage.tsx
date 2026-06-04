import { useMemo, useState } from 'react';
import { getWishStatus } from '@/lib/calculations';
import { useBalance } from '@/hooks/useBalance';
import { useAppStore } from '@/store/useAppStore';
import { useReward } from '@/context/RewardContext';
import type { Wish } from '@/types';
import { WishCard } from '@/components/wish/WishCard';
import { WishFormDialog } from '@/components/wish/WishFormDialog';
import { RedeemConfirmDialog } from '@/components/wish/RedeemConfirmDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type WishFilter = 'all' | 'active' | 'redeemed';

export function WishlistPage() {
  const wishes = useAppStore((s) => s.wishes);
  const redeemWish = useAppStore((s) => s.redeemWish);
  const deleteWish = useAppStore((s) => s.deleteWish);
  const pinnedWishId = useAppStore((s) => s.settings.pinnedWishId);
  const setPinnedWishId = useAppStore((s) => s.setPinnedWishId);
  const { balance } = useBalance();
  const { showToast } = useReward();
  const [filter, setFilter] = useState<WishFilter>('all');
  const [redeemTarget, setRedeemTarget] = useState<Wish | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const filtered = useMemo(() => {
    return wishes.filter((wish) => {
      const status = getWishStatus(wish, balance);
      if (filter === 'redeemed') {
        return status === 'redeemed';
      }
      if (filter === 'active') {
        return status !== 'redeemed';
      }
      return true;
    });
  }, [wishes, balance, filter]);

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const sa = getWishStatus(a, balance);
        const sb = getWishStatus(b, balance);
        if (sa === 'available' && sb !== 'available') {
          return -1;
        }
        if (sb === 'available' && sa !== 'available') {
          return 1;
        }
        return a.cost - b.cost;
      }),
    [filtered, balance],
  );

  const handleRedeemClick = (wish: Wish) => {
    setRedeemTarget(wish);
    setConfirmOpen(true);
  };

  const handleConfirmRedeem = () => {
    if (!redeemTarget) {
      return;
    }
    redeemWish(redeemTarget.id);
    showToast(`已兌換「${redeemTarget.title}」`, 'success');
  };

  const handleTogglePin = (wishId: string) => {
    const next = pinnedWishId === wishId ? null : wishId;
    setPinnedWishId(next);
    if (next) {
      const wish = wishes.find((w) => w.id === wishId);
      showToast(
        wish ? `已釘選「${wish.title}」為主目標` : '已設為主目標',
        'info',
      );
    } else {
      showToast('已取消主目標釘選', 'info');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <WishFormDialog />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as WishFilter)}>
        <TabsList>
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="active">進行中</TabsTrigger>
          <TabsTrigger value="redeemed">已兌換</TabsTrigger>
        </TabsList>
        <TabsContent value={filter} className="mt-0">
          {sorted.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              {filter === 'redeemed'
                ? '尚無已兌換願望。'
                : '尚無願望，點上方按鈕新增第一個目標。'}
            </p>
          ) : (
            <div className="space-y-3">
              {sorted.map((wish) => (
                <WishCard
                  key={wish.id}
                  wish={wish}
                  balance={balance}
                  isPinned={pinnedWishId === wish.id}
                  onRedeem={handleRedeemClick}
                  onDelete={deleteWish}
                  onTogglePin={handleTogglePin}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <RedeemConfirmDialog
        wish={redeemTarget}
        balance={balance}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirmRedeem}
      />
    </div>
  );
}
