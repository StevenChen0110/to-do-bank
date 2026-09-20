// A curated reward catalog powering preference-based recommendations.
// Phase A: local data, no external API. `url` deep-links to a real shopping
// search so "去逛逛" always works. Swap this module for a live product API
// later without touching the UI.

export interface ShopCategory {
  id: string;
  label: string;
  emoji: string;
}

export interface ShopProduct {
  id: string;
  name: string;
  emoji: string;
  category: string;
  /** Suggested price in NT$. */
  price: number;
}

export const SHOP_CATEGORIES: ShopCategory[] = [
  { id: '3c', label: '3C', emoji: '🎧' },
  { id: 'food', label: '美食', emoji: '🍜' },
  { id: 'book', label: '書籍', emoji: '📚' },
  { id: 'game', label: '遊戲', emoji: '🎮' },
  { id: 'travel', label: '旅遊', emoji: '✈️' },
  { id: 'beauty', label: '美妝', emoji: '💄' },
  { id: 'sport', label: '運動', emoji: '🏃' },
  { id: 'home', label: '居家', emoji: '🛋️' },
  { id: 'fashion', label: '服飾', emoji: '👕' },
  { id: 'fun', label: '娛樂體驗', emoji: '🎫' },
];

export const SHOP_CATALOG: ShopProduct[] = [
  // 3C
  { id: '3c-earbuds', name: '無線藍牙耳機', emoji: '🎧', category: '3c', price: 1500 },
  { id: '3c-keyboard', name: '機械式鍵盤', emoji: '⌨️', category: '3c', price: 2200 },
  { id: '3c-mouse', name: '無線滑鼠', emoji: '🖱️', category: '3c', price: 900 },
  { id: '3c-powerbank', name: '快充行動電源', emoji: '🔋', category: '3c', price: 800 },
  { id: '3c-speaker', name: '藍牙喇叭', emoji: '🔊', category: '3c', price: 1800 },
  { id: '3c-watch', name: '智慧手錶', emoji: '⌚', category: '3c', price: 4500 },
  { id: '3c-tablet', name: '平板電腦', emoji: '📲', category: '3c', price: 9900 },

  // 美食
  { id: 'food-buffet', name: '飯店自助餐一客', emoji: '🍽️', category: 'food', price: 1280 },
  { id: 'food-hotpot', name: '個人精緻火鍋', emoji: '🍲', category: 'food', price: 580 },
  { id: 'food-cake', name: '手工蛋糕', emoji: '🍰', category: 'food', price: 650 },
  { id: 'food-boba', name: '手搖飲一週份', emoji: '🧋', category: 'food', price: 420 },
  { id: 'food-coffee', name: '精品咖啡豆', emoji: '☕', category: 'food', price: 700 },
  { id: 'food-sushi', name: '無菜單壽司', emoji: '🍣', category: 'food', price: 2000 },

  // 書籍
  { id: 'book-best', name: '暢銷新書一本', emoji: '📕', category: 'book', price: 420 },
  { id: 'book-set', name: '套書系列', emoji: '📚', category: 'book', price: 1200 },
  { id: 'book-ebook', name: '電子書閱讀器', emoji: '📖', category: 'book', price: 3990 },
  { id: 'book-mag', name: '雜誌年訂', emoji: '📰', category: 'book', price: 1800 },
  { id: 'book-note', name: '質感筆記本', emoji: '📓', category: 'book', price: 350 },

  // 遊戲
  { id: 'game-aaa', name: '3A 大作遊戲', emoji: '🎮', category: 'game', price: 1790 },
  { id: 'game-indie', name: '獨立遊戲', emoji: '👾', category: 'game', price: 450 },
  { id: 'game-pass', name: '遊戲訂閱三個月', emoji: '🕹️', category: 'game', price: 800 },
  { id: 'game-pad', name: '無線手把', emoji: '🎯', category: 'game', price: 1700 },
  { id: 'game-lego', name: '積木模型', emoji: '🧱', category: 'game', price: 2500 },

  // 旅遊
  { id: 'travel-daytrip', name: '一日小旅行', emoji: '🧳', category: 'travel', price: 1500 },
  { id: 'travel-hotel', name: '住宿一晚', emoji: '🏨', category: 'travel', price: 2800 },
  { id: 'travel-hotspring', name: '溫泉泡湯', emoji: '♨️', category: 'travel', price: 1200 },
  { id: 'travel-highspeed', name: '高鐵來回票', emoji: '🚄', category: 'travel', price: 2400 },
  { id: 'travel-camp', name: '露營體驗', emoji: '⛺', category: 'travel', price: 1800 },

  // 美妝
  { id: 'beauty-perfume', name: '香水', emoji: '🧴', category: 'beauty', price: 2600 },
  { id: 'beauty-skincare', name: '保養組', emoji: '🧖', category: 'beauty', price: 1500 },
  { id: 'beauty-lip', name: '精品唇膏', emoji: '💄', category: 'beauty', price: 1100 },
  { id: 'beauty-mask', name: '面膜一盒', emoji: '🎭', category: 'beauty', price: 500 },

  // 運動
  { id: 'sport-shoes', name: '跑鞋', emoji: '👟', category: 'sport', price: 2800 },
  { id: 'sport-yoga', name: '瑜珈墊', emoji: '🧘', category: 'sport', price: 800 },
  { id: 'sport-bottle', name: '保溫運動水壺', emoji: '🥤', category: 'sport', price: 650 },
  { id: 'sport-gym', name: '健身房月費', emoji: '🏋️', category: 'sport', price: 1200 },
  { id: 'sport-dumbbell', name: '可調式啞鈴', emoji: '💪', category: 'sport', price: 1900 },

  // 居家
  { id: 'home-diffuser', name: '香氛擴香', emoji: '🕯️', category: 'home', price: 900 },
  { id: 'home-lamp', name: '氣氛檯燈', emoji: '💡', category: 'home', price: 1300 },
  { id: 'home-pillow', name: '記憶枕', emoji: '🛏️', category: 'home', price: 1600 },
  { id: 'home-plant', name: '室內植栽', emoji: '🪴', category: 'home', price: 600 },
  { id: 'home-mug', name: '質感馬克杯', emoji: '🍵', category: 'home', price: 480 },

  // 服飾
  { id: 'fashion-tee', name: '設計款上衣', emoji: '👕', category: 'fashion', price: 980 },
  { id: 'fashion-jacket', name: '外套', emoji: '🧥', category: 'fashion', price: 2500 },
  { id: 'fashion-bag', name: '側背包', emoji: '👜', category: 'fashion', price: 1800 },
  { id: 'fashion-cap', name: '帽子', emoji: '🧢', category: 'fashion', price: 700 },
  { id: 'fashion-watch', name: '手錶', emoji: '⌚', category: 'fashion', price: 3200 },

  // 娛樂體驗
  { id: 'fun-concert', name: '演唱會門票', emoji: '🎫', category: 'fun', price: 2800 },
  { id: 'fun-movie', name: '電影套票', emoji: '🎬', category: 'fun', price: 600 },
  { id: 'fun-escape', name: '密室逃脫', emoji: '🗝️', category: 'fun', price: 800 },
  { id: 'fun-exhibit', name: '展覽門票', emoji: '🖼️', category: 'fun', price: 450 },
  { id: 'fun-karaoke', name: 'KTV 歡唱', emoji: '🎤', category: 'fun', price: 700 },
];

/** A real shopping-search deep-link for a product (opens Google Shopping). */
export function shopSearchUrl(name: string): string {
  return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(name)}`;
}

/**
 * Recommend products by preference + keyword.
 * - With a query: search names across the whole catalog.
 * - Otherwise: items in the preferred categories (all when no preference set),
 *   interleaved across categories so the feed feels varied, cheapest-first.
 */
export function recommendProducts(
  prefs: string[],
  query: string,
): ShopProduct[] {
  const q = query.trim().toLowerCase();
  if (q) {
    return SHOP_CATALOG.filter((p) => p.name.toLowerCase().includes(q));
  }
  const pool =
    prefs.length > 0
      ? SHOP_CATALOG.filter((p) => prefs.includes(p.category))
      : SHOP_CATALOG;

  // Interleave by category (round-robin) so no single category dominates.
  const byCat = new Map<string, ShopProduct[]>();
  for (const p of pool) {
    const list = byCat.get(p.category) ?? [];
    list.push(p);
    byCat.set(p.category, list);
  }
  for (const list of byCat.values()) list.sort((a, b) => a.price - b.price);

  const cats = [...byCat.keys()];
  const out: ShopProduct[] = [];
  let added = true;
  let i = 0;
  while (added) {
    added = false;
    for (const c of cats) {
      const list = byCat.get(c)!;
      if (i < list.length) {
        out.push(list[i]);
        added = true;
      }
    }
    i += 1;
  }
  return out;
}
