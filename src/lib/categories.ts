import type { CategoryDef } from '../types';

export const BUILTIN_CATEGORIES: CategoryDef[] = [
  { id: 'work', label: '工作' },
  { id: 'study', label: '學習' },
  { id: 'health', label: '運動' },
  { id: 'life', label: '生活' },
  { id: 'other', label: '其他' },
];

export function allCategories(custom: CategoryDef[]): CategoryDef[] {
  return [...BUILTIN_CATEGORIES, ...custom];
}

export function labelForCategory(id: string, custom: CategoryDef[]): string {
  return allCategories(custom).find((c) => c.id === id)?.label ?? id;
}
