import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

export function formatCurrency(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? '-' : '';
  return `${sign}NT$ ${Math.abs(rounded).toLocaleString('zh-TW')}`;
}

/** HUD 緊湊顯示，例：NT$120 */
export function formatCurrencyCompact(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? '-' : '';
  return `${sign}NT$${Math.abs(rounded).toLocaleString('zh-TW')}`;
}

export function formatDate(iso: string, pattern = 'yyyy/MM/dd'): string {
  return format(new Date(iso), pattern, { locale: zhTW });
}
