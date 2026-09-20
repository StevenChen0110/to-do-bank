import { useState } from 'react';
import { Link2, Loader2, Plus } from 'lucide-react';
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

interface OgResult {
  title?: string;
  image?: string;
  price?: number;
}

export function WishFormDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [cost, setCost] = useState('');
  const [url, setUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [fetchNote, setFetchNote] = useState<string | null>(null);
  const addWish = useAppStore((s) => s.addWish);

  const reset = () => {
    setTitle('');
    setCost('');
    setUrl('');
    setImageUrl('');
    setFetchNote(null);
  };

  const autofill = async () => {
    const target = url.trim();
    if (!/^https?:\/\/.+/i.test(target)) {
      setFetchNote('請貼上完整的商品網址（http…）');
      return;
    }
    setFetching(true);
    setFetchNote(null);
    try {
      const res = await fetch(`/api/og?url=${encodeURIComponent(target)}`);
      if (!res.ok) throw new Error('bad');
      const data: OgResult = await res.json();
      if (data.image) setImageUrl(data.image);
      if (data.title && !title.trim()) setTitle(data.title.slice(0, 100));
      if (data.price && !cost.trim()) setCost(String(data.price));
      setFetchNote(
        data.image || data.title
          ? '已帶入商品資訊，可再手動修改'
          : '沒抓到資訊，請手動填寫',
      );
    } catch {
      setFetchNote('抓取失敗，請手動填寫（或貼圖片網址）');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = () => {
    const trimmed = title.trim();
    const amount = Number.parseInt(cost, 10);
    if (!trimmed || !Number.isFinite(amount) || amount <= 0) return;
    addWish({
      title: trimmed,
      cost: amount,
      productUrl: url.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
    });
    reset();
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          新增願望
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增願望</DialogTitle>
          <DialogDescription>
            貼上商品連結自動帶入，或手動填寫。存夠就能入手。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {/* 商品連結 + 自動帶入 */}
          <div>
            <label htmlFor="wish-url" className="mb-1 block text-sm font-medium">
              商品連結（選填）
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="wish-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="貼上 momo／蝦皮／博客來… 商品網址"
                  className="pl-8"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={autofill}
                disabled={fetching || !url.trim()}
                className="shrink-0"
              >
                {fetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  '自動帶入'
                )}
              </Button>
            </div>
            {fetchNote && (
              <p className="mt-1 text-xs text-muted-foreground">{fetchNote}</p>
            )}
          </div>

          {/* 商品預覽 */}
          {imageUrl && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-2">
              <img
                src={imageUrl}
                alt=""
                className="h-16 w-16 rounded-md object-cover"
                onError={() => setImageUrl('')}
              />
              <span className="text-xs text-muted-foreground">商品預覽</span>
            </div>
          )}

          <div>
            <label htmlFor="wish-title" className="mb-1 block text-sm font-medium">
              願望名稱
            </label>
            <Input
              id="wish-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：無線耳機"
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
