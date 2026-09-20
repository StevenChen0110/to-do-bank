// Runtime types for the JARVIS intelligence layer. These describe processed
// information items — they are produced server-side (Slice 2+) and, for now,
// come from mock data so the whole experience is clickable locally.

export type JarvisDomain = 'finance' | 'tech' | 'career' | 'project';

/** Epistemic label — never present AI speculation as fact. */
export type FactType = 'fact' | 'interpretation' | 'opinion' | 'recommendation';

export type JarvisStatus = 'new' | 'saved' | 'dismissed' | 'added';

export interface JarvisAction {
  /** Suggested task title. */
  label: string;
  /** Suggested deadline (yyyy-MM-dd), optional. */
  suggestedDate?: string;
}

export interface JarvisItem {
  id: string;
  domain: JarvisDomain;
  /** Short topic label, e.g. "AI", "美股", "PM". */
  topic: string;
  /** Headline — what happened. */
  title: string;
  /** 1–2 sentence factual summary. */
  whatHappened: string;
  /** Why it matters to THIS user. */
  whyItMatters: string;
  /** 0–100 personal relevance. */
  relevance: number;
  /** 0–100 objective importance. */
  importance: number;
  factType: FactType;
  source: string;
  url: string;
  /** ISO timestamp. */
  publishedAt: string;
  /** Optional recommended action → can become a to-do. */
  action?: JarvisAction;
  status: JarvisStatus;
}

export const DOMAIN_LABEL: Record<JarvisDomain, string> = {
  finance: '財經',
  tech: '科技',
  career: '職涯',
  project: '專案',
};

export const FACT_LABEL: Record<FactType, string> = {
  fact: '事實',
  interpretation: '判讀',
  opinion: '觀點',
  recommendation: '建議',
};
