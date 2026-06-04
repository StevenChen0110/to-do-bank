import type { TaskCategory } from '../types';

/** Labels used in quick-add `[標籤] ` prefixes (excludes `other`). */
export const QUICK_CATEGORY_LABELS: Record<
  Exclude<TaskCategory, 'other'>,
  string
> = {
  work: '工作',
  life: '生活',
  health: '運動',
  study: '學習',
};

const PREFIX_PATTERN = /^\[(工作|生活|運動|學習)\]\s*/;

export function categoryPrefixLabel(
  category: TaskCategory,
): string | null {
  if (category === 'other') {
    return null;
  }
  return QUICK_CATEGORY_LABELS[category];
}

export function stripCategoryPrefix(title: string): string {
  return title.replace(PREFIX_PATTERN, '').trimStart();
}

/** Replace any existing quick-add prefix; never stack duplicates. */
export function formatTitleWithCategoryPrefix(
  title: string,
  category: TaskCategory,
): string {
  const body = stripCategoryPrefix(title);
  const label = categoryPrefixLabel(category);
  if (!label) {
    return body;
  }
  if (!body) {
    return `[${label}] `;
  }
  return `[${label}] ${body}`;
}
