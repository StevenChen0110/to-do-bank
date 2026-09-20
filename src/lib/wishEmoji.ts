/** Guess a product emoji from a wish title — pure shop flavour, no data stored. */
const KEYWORD_EMOJI: [RegExp, string][] = [
  [/耳機|耳罩|airpod|headphone/i, '🎧'],
  [/遊戲|switch|ps5|xbox|game|電玩/i, '🎮'],
  [/書|book|閱讀/i, '📚'],
  [/咖啡|coffee|拿鐵/i, '☕'],
  [/鞋|sneaker|shoe/i, '👟'],
  [/衣|外套|shirt|jacket|服/i, '👕'],
  [/包|背包|bag/i, '👜'],
  [/手機|iphone|phone/i, '📱'],
  [/電腦|筆電|mac|laptop|pc/i, '💻'],
  [/平板|ipad|tablet/i, '📲'],
  [/相機|鏡頭|camera/i, '📷'],
  [/錶|watch|手錶/i, '⌚'],
  [/旅|旅行|機票|travel|trip/i, '✈️'],
  [/蛋糕|甜點|cake|dessert/i, '🍰'],
  [/吃|大餐|美食|拉麵|food|餐/i, '🍜'],
  [/飲料|手搖|奶茶|boba/i, '🧋'],
  [/健身|重訓|gym/i, '🏋️'],
  [/花|flower/i, '💐'],
  [/香水|perfume/i, '🧴'],
  [/演唱會|門票|concert|ticket/i, '🎫'],
];

export function guessWishEmoji(title: string): string {
  for (const [re, emoji] of KEYWORD_EMOJI) {
    if (re.test(title)) return emoji;
  }
  return '🎁';
}
