import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function WishFormDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [cost, setCost] = useState('');
  const addWish = useAppStore((s) => s.addWish);

  const reset = () => {
    setTitle('');
    setCost('');
  };

  const handleSubmit = () => {
    const trimmed = title.trim();
    const amount = Number.parseInt(cost, 10);
    if (!trimmed || !Number.isFinite(amount) || amount <= 0) {
      return;
    }
    addWish({ title: trimmed, cost: amount });
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full gap-2">
          <Plus className="h-4 w-4" />
          新增願望
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增願望</DialogTitle>
          <DialogDescription>
            設定一個對自己的獎勵，存夠虛擬幣就能兌換。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label htmlFor="wish-title" className="mb-1 block text-sm font-medium">
              願望名稱
            </label>
            <Input
              id="wish-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：週末電影"
              maxLength={100}
            />
          </div>
          <div>
            <label htmlFor="wish-cost" className="mb-1 block text-sm font-medium">
              目標金額（元）
            </label>
            <Input
              id="wish-cost"
              type="number"
              min={1}
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="500"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button type="button" onClick={handleSubmit}>
            建立
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
