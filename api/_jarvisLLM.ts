// The single place JARVIS talks to an LLM. Swap this file to change providers
// (currently Google Gemini). Given raw feed items + the user's profile, it
// returns relevance-scored, summarized items — aggressively filtered so only
// what THIS user should care about survives.
import type { RawItem } from './_jarvisSources';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export interface ScoredItem {
  index: number;
  domain: 'finance' | 'tech' | 'career' | 'project';
  topic: string;
  whatHappened: string;
  whyItMatters: string;
  relevance: number;
  importance: number;
  factType: 'fact' | 'interpretation' | 'opinion' | 'recommendation';
  action?: { label: string; suggestedDate?: string };
}

export interface JarvisProfileInput {
  interests?: string[];
  watchlist?: string[];
  markets?: string[];
  riskPreference?: string;
  careerRoles?: string[];
  industries?: string[];
  projects?: string[];
  companies?: string[];
}

function buildPrompt(items: RawItem[], profile: JarvisProfileInput): string {
  const p = {
    興趣: profile.interests ?? [],
    投資觀察清單: profile.watchlist ?? [],
    關注市場: profile.markets ?? [],
    風險偏好: profile.riskPreference ?? '未設定',
    職涯: profile.careerRoles ?? [],
    產業: profile.industries ?? [],
    專案: profile.projects ?? [],
    重要公司: profile.companies ?? [],
  };
  const list = items
    .map(
      (it, i) =>
        `${i}. [${it.domainHint}] ${it.title}\n   來源:${it.source}｜${it.snippet}`,
    )
    .join('\n');

  return `你是使用者的個人情報官 JARVIS。任務是「移除雜訊」，只留下這位使用者「今天真正需要知道」的資訊，並以投資與科技/職涯為重點。

使用者輪廓（用來判斷個人相關性）：
${JSON.stringify(p, null, 0)}

以下是今天抓到的原始新聞（含索引）：
${list}

規則：
- 積極過濾。只輸出對「這位使用者」有明確理由在意的項目；寧缺勿濫，通常 3～8 則。
- relevance 是「對這位使用者的個人相關性」(0-100)；importance 是「客觀重要性」(0-100)。與其觀察清單/市場/專案直接相關者 relevance 要高。
- factType 必須誠實區分：fact(事實)/interpretation(推論)/opinion(觀點)/recommendation(建議)。不要把臆測當事實。
- whatHappened：1-2 句中立事實摘要（繁體中文）。
- whyItMatters：用「你」稱呼，說明為何與此使用者相關（繁體中文，1-2 句）。
- 僅在有明確、具體行動時給 action.label（繁體中文的待辦標題），否則省略 action。
- domain 取 finance/tech/career/project 其一。topic 給簡短標籤（如「美股」「AI」「PM」）。

只輸出 JSON 陣列，不要額外文字。每個元素：
{"index":number,"domain":"finance|tech|career|project","topic":string,"whatHappened":string,"whyItMatters":string,"relevance":number,"importance":number,"factType":"fact|interpretation|opinion|recommendation","action"?:{"label":string,"suggestedDate"?:"yyyy-MM-dd"}}`;
}

/** Call Gemini; returns scored items or throws. Requires GEMINI_API_KEY. */
export async function scoreItems(
  items: RawItem[],
  profile: JarvisProfileInput,
): Promise<ScoredItem[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('missing GEMINI_API_KEY');
  if (items.length === 0) return [];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  let text: string;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(items, profile) }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      }),
    });
    if (!res.ok) {
      throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  } finally {
    clearTimeout(timer);
  }

  const jsonStart = text.indexOf('[');
  const jsonEnd = text.lastIndexOf(']');
  if (jsonStart === -1 || jsonEnd === -1) throw new Error('gemini: no JSON array');
  const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as ScoredItem[];
  return Array.isArray(parsed) ? parsed : [];
}
