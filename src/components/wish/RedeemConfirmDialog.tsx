import type { Wish } from '@/types';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RedeemConfirmDialogProps {
  wish: Wish | null;
  balance: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function RedeemConfirmDialog({
  wish,
  balance,
  open,
  onOpenChange,
  onConfirm,
}: RedeemConfirmDialogProps) {
  const canRedeem = wish !== null && balance >= wish.cost;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>確認兌換</DialogTitle>
          <DialogDescription>
            {wish
              ? `你即將兌換「${wish.title}」，將扣除 ${formatCurrency(wish.cost)}。這是你對自己的承諾——記得去現實世界履行獎勵。`
              : ''}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            type="button"
            disabled={!canRedeem}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            確認兌換
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
