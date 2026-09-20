// Mock intelligence for Slice 1 — lets the full JARVIS experience be clicked
// locally with no API keys. Slice 2 replaces this with server-side ingestion +
// Claude summarization/scoring; the JarvisItem shape stays identical.
import type { JarvisItem } from './types';

/** hours-ago → ISO timestamp, so the feed always looks fresh. */
function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

export function buildMockItems(): JarvisItem[] {
  return [
    {
      id: 'mock-nvda',
      domain: 'finance',
      topic: '美股',
      title: 'Nvidia 盤後下跌 4%，資料中心展望成焦點',
      whatHappened:
        'Nvidia 公布財報，營收優於預期但下一季資料中心指引偏保守，盤後一度下跌約 4%。',
      whyItMatters:
        '你的觀察清單有 NVDA、TSM。Nvidia 展望牽動整條 AI 供應鏈，台積電營收與其資本支出高度連動。',
      relevance: 92,
      importance: 88,
      factType: 'fact',
      source: 'Reuters',
      url: 'https://www.reuters.com/technology/',
      publishedAt: hoursAgo(3),
      action: { label: '檢視 NVDA／TSM 部位與這季展望' },
      status: 'new',
    },
    {
      id: 'mock-anthropic',
      domain: 'tech',
      topic: 'AI',
      title: 'Anthropic 發布新一代 Claude 模型與 Agent 能力更新',
      whatHappened:
        'Anthropic 推出新模型，強化長時間任務、工具使用與程式能力，並更新 Agent SDK。',
      whyItMatters:
        '你關注 AI 與產品管理。新的 Agent 能力可能改變你在打造 AI 功能時的架構選擇與競品節奏。',
      relevance: 90,
      importance: 82,
      factType: 'fact',
      source: 'Anthropic Blog',
      url: 'https://www.anthropic.com/news',
      publishedAt: hoursAgo(6),
      action: {
        label: '花 20 分鐘評估新 Agent 能力對現有專案的影響',
      },
      status: 'new',
    },
    {
      id: 'mock-fed',
      domain: 'finance',
      topic: '總經',
      title: '下週 Fed 利率會議，市場預期按兵不動',
      whatHappened:
        '聯準會下週召開利率決策會議，市場多數預期維持利率不變，重點在會後對降息路徑的措辭。',
      whyItMatters:
        '利率路徑影響你偏成長股的配置與台美股資金流向；會前先想好情境有助於避免當下情緒操作。',
      relevance: 78,
      importance: 80,
      factType: 'interpretation',
      source: 'Bloomberg',
      url: 'https://www.bloomberg.com/markets',
      publishedAt: hoursAgo(10),
      action: {
        label: '會議前檢視投資組合與現金水位',
      },
      status: 'new',
    },
    {
      id: 'mock-pm',
      domain: 'career',
      topic: 'PM',
      title: 'AI 產品經理需求上升，GTM 與評估能力被點名',
      whatHappened:
        '多份產業報告指出，具備 AI 產品評估、資料判讀與 GTM 落地能力的 PM 需求明顯增加。',
      whyItMatters:
        '對應你的職涯方向（Product Manager／GTM）。這是可主動累積的技能訊號，而非被動觀望。',
      relevance: 74,
      importance: 60,
      factType: 'interpretation',
      source: 'Lenny’s Newsletter',
      url: 'https://www.lennysnewsletter.com/',
      publishedAt: hoursAgo(20),
      action: { label: '整理一份 AI 產品評估框架練習' },
      status: 'new',
    },
    {
      id: 'mock-tsmc',
      domain: 'finance',
      topic: '台股',
      title: '台積電法說釋出資本支出上修訊號',
      whatHappened:
        '台積電法說會釋出先進製程需求強勁、資本支出可能上修的訊號，供應鏈個股同步走強。',
      whyItMatters:
        '你的清單含 TSM。資本支出上修通常反映 AI 需求延續，對你長期持有的判斷是正向佐證。',
      relevance: 71,
      importance: 72,
      factType: 'fact',
      source: 'CNA',
      url: 'https://www.cna.com.tw/',
      publishedAt: hoursAgo(26),
      status: 'new',
    },
    {
      id: 'mock-apple',
      domain: 'tech',
      topic: 'Apple',
      title: 'Apple 傳將在裝置端強化生成式 AI',
      whatHappened:
        '市場傳聞 Apple 將在下一代系統加強裝置端生成式 AI，聚焦隱私與離線能力。',
      whyItMatters:
        '和你關注的 AI 產品趨勢相關，但對你目前專案的直接影響較小——先知道、不需行動。',
      relevance: 52,
      importance: 55,
      factType: 'opinion',
      source: 'The Verge',
      url: 'https://www.theverge.com/',
      publishedAt: hoursAgo(30),
      status: 'new',
    },
    {
      id: 'mock-devtool',
      domain: 'tech',
      topic: '開發工具',
      title: '新一波 AI 編碼工具主打「代理式」工作流',
      whatHappened:
        '數個開發工具推出代理式（agentic）編碼工作流，強調多步驟自動化與可回溯執行。',
      whyItMatters:
        '若你的專案涉及開發者體驗或工具鏈，這是值得追蹤的競品與靈感來源。',
      relevance: 58,
      importance: 50,
      factType: 'interpretation',
      source: 'Hacker News',
      url: 'https://news.ycombinator.com/',
      publishedAt: hoursAgo(34),
      status: 'new',
    },
    {
      id: 'mock-etf',
      domain: 'finance',
      topic: 'ETF',
      title: '高股息 ETF 資金流出、市值型延續流入',
      whatHappened:
        '近期資金由部分高股息 ETF 轉向市值型 ETF，反映投資人對成長與總報酬的偏好。',
      whyItMatters:
        '若你的配置含台股 ETF，這個資金流向值得納入再平衡的參考，但屬中性資訊。',
      relevance: 49,
      importance: 48,
      factType: 'interpretation',
      source: 'MoneyDJ',
      url: 'https://www.moneydj.com/',
      publishedAt: hoursAgo(40),
      status: 'new',
    },
  ];
}
