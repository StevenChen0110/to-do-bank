// 職能 (role) templates — the 80% default. Each role ships a set of category
// modules and project blueprints appropriate to that function. Everything is
// materialised into the EXISTING CategoryDef / Project / ProjectStep models
// via existing store actions; this file is only the seed data + selection.
//
// Metric tracking is deliberately NOT here (spec §21 — future phase).

export interface RoleProjectBlueprint {
  title: string;
  goal: string;
  /** Pre-split steps so a project is executable the moment it's created. */
  steps: string[];
}

export interface RoleTemplate {
  id: string;
  label: string;
  /** One-line description of who this fits. */
  hint: string;
  /** Category modules for this function (become real CategoryDefs). */
  categories: string[];
  /** Common project shapes for this function. */
  projects: RoleProjectBlueprint[];
}

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    id: 'pm',
    label: 'Product Manager',
    hint: '產品規劃、新品導入、營收與跨部門推進',
    categories: [
      '新品導入 & 老品下市',
      'Business / Revenue',
      'Promotion / Marketing',
      'Customer Project',
      'Operations',
    ],
    projects: [
      {
        title: '新品導入 (NPI)',
        goal: '新品如期上市並達成首批銷售目標',
        steps: [
          '定義產品規格與定位',
          '成本與定價分析',
          '首批數量確認',
          '通路與上市計畫',
          '上市後銷售追蹤',
        ],
      },
      {
        title: '老品下市 (EOL)',
        goal: '庫存健康出清、平順轉換到接替機種',
        steps: ['盤點剩餘庫存', '訂定出清策略', '通知通路與客戶', '確認接替機種銜接'],
      },
      {
        title: '季度營收檢視',
        goal: '掌握達成率並找出可施力的缺口',
        steps: ['更新營收數字', '分析達成率缺口', '擬定補救行動', '與相關單位對齊'],
      },
    ],
  },
  {
    id: 'marketing',
    label: '行銷 / PMM / GTM',
    hint: '上市規劃、檔期經營、內容素材與成效',
    categories: [
      'GTM / 上市規劃',
      'Campaign / 檔期',
      'Content / 素材',
      'Channel / 通路',
      'Analytics / 成效',
    ],
    projects: [
      {
        title: 'GTM 上市計畫',
        goal: '完成上市定位、訊息與通路準備',
        steps: ['目標客群與定位', '核心訊息與賣點', '素材製作', '通路溝通', '上市成效追蹤'],
      },
      {
        title: '行銷檔期專案',
        goal: '檔期如期上線並達成業績目標',
        steps: ['檔期機制設計', '素材與文案確認', '平台上架設定', '檔期成效複盤'],
      },
    ],
  },
  {
    id: 'sales',
    label: '業務 / BD',
    hint: '開發客戶、報價合約、帳號經營與業績',
    categories: [
      'Pipeline / 開發',
      'Quote / 報價合約',
      'Account / 客戶經營',
      'Forecast / 業績',
      'Support / 售後',
    ],
    projects: [
      {
        title: '新客戶開發',
        goal: '完成從接觸到首張訂單的轉換',
        steps: ['名單整理與接觸', '需求訪談', '提案與報價', '合約條款確認', '首張訂單'],
      },
      {
        title: '季度業績達成',
        goal: '確保季度目標達成並預警缺口',
        steps: ['盤點在手訂單', '更新預測', '找出缺口與補救', '重點客戶跟進'],
      },
    ],
  },
  {
    id: 'rd',
    label: '工程 / RD',
    hint: '需求規格、開發、測試驗證與上線',
    categories: [
      'Spec / 需求規格',
      'Development / 開發',
      'QA / 測試驗證',
      'Release / 上線部署',
      'Tech Debt / 技術債',
    ],
    projects: [
      {
        title: '功能開發',
        goal: '功能如期上線且品質穩定',
        steps: ['需求釐清與規格', '技術設計', '開發實作', '測試驗證', '上線與監控'],
      },
      {
        title: '技術債清理',
        goal: '降低維護成本與風險',
        steps: ['盤點問題與影響', '排定優先順序', '重構與修正', '回歸測試'],
      },
    ],
  },
];

export function roleById(id: string | undefined): RoleTemplate | null {
  return ROLE_TEMPLATES.find((r) => r.id === id) ?? null;
}

/** Category labels this role expects but the user doesn't have yet. */
export function missingRoleCategories(
  role: RoleTemplate,
  existing: { label: string }[],
): string[] {
  const have = new Set(existing.map((c) => c.label));
  return role.categories.filter((c) => !have.has(c));
}
