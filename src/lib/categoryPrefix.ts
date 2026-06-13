const QUICK_CATEGORY_LABELS: Record<string, string> = {
  work: '工作',
  life: '生活',
  health: '運動',
  study: '學習',
};

const PREFIX_PATTERN = /^\[(工作|生活|運動|學習)\]\s*/;

export function categoryPrefixLabel(category: string): string | null {
  return QUICK_CATEGORY_LABELS[category] ?? null;
}

export function stripCategoryPrefix(title: string): string {
  return title.replace(PREFIX_PATTERN, '').trimStart();
}

export function formatTitleWithCategoryPrefix(
  title: string,
  category: string,
): string {
  const body = stripCategoryPrefix(title);
  const label = categoryPrefixLabel(category);
  if (!label) return body;
  if (!body) return `[${label}] `;
  return `[${label}] ${body}`;
}
