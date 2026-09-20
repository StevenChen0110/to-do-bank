import { useState } from 'react';
import { guessWishEmoji } from '@/lib/wishEmoji';
import { cn } from '@/lib/utils';

interface WishThumbProps {
  title: string;
  imageUrl?: string;
  /** Box classes (size, rounding, shrink) — applied to both image and fallback. */
  className?: string;
  /** Extra classes for the emoji fallback (background, text size). */
  emojiClassName?: string;
}

/**
 * A wish's avatar: the product image when present (with graceful fallback to a
 * guessed emoji on a missing/broken URL). Single source for what was previously
 * duplicated across the shop card, home teaser, and redeemed shelf.
 */
export function WishThumb({ title, imageUrl, className, emojiClassName }: WishThumbProps) {
  const [ok, setOk] = useState(true);
  if (imageUrl && ok) {
    return (
      <img
        src={imageUrl}
        alt=""
        onError={() => setOk(false)}
        className={cn('object-cover', className)}
      />
    );
  }
  return (
    <span className={cn('flex items-center justify-center', className, emojiClassName)} aria-hidden>
      {guessWishEmoji(title)}
    </span>
  );
}
