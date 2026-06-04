# To Do Bank

自我獎勵待辦系統：完成任務賺取虛擬幣，兌換願望。

## Phase 3 功能（Juiciness + 部署）

- **入帳動效**：多枚金幣 + `+NT$10` 從輸入區飛出（可定位觸發點）
- **餘額動畫**：smooth count-up；兌換/撤銷扣款時輕微 shake + 短暫紅色閃爍
- **解鎖 moment**：願望 locked→available 卡片 pulse/glow；撲滿「最接近解鎖」高亮
- **Toast**：完成入帳、兌換成功、撤銷退款（輕量自製，無額外依賴）
- **微互動**：按鈕 `active:scale`、今日列表 stagger 進場
- **UX**：待辦分類 chips（工作/生活/運動/學習）、願望三態視覺、mobile 觸控與 safe-area
- **部署**：`vercel.json` SPA rewrite、PWA manifest、README 部署步驟

## Phase 2 功能

- **三 Tab 導覽**：撲滿（Dashboard）、待辦回顧、願望清單
- **今日成就記錄**：輸入標題按 Enter 即完成並入帳（預設 +10 元）
- **撲滿儀表板**：動畫餘額、今日成就快照、最接近解鎖的願望
- **願望系統**：進度條、locked / available / redeemed 狀態、兌換確認
- **UI**：shadcn/ui、繁體中文、mobile-first、IndexedDB 持久化

## 開發

```bash
npm install
npm run dev
```

在瀏覽器開啟終端顯示的本地網址（通常 `http://localhost:5173`）。

### 建議測試流程

1. **待辦回顧**：選分類 → 輸入「整理桌面」按 Enter → 金幣飛出 + Toast「+NT$10 已入帳」
2. **撲滿**：餘額 count-up；存夠願望時「最接近解鎖」脈動高亮
3. **願望**：兌換 → Toast + 餘額 shake；locked/available/redeemed 視覺區分
4. **撤銷**：Toast「已撤銷，NT$10 已退回」+ 餘額回彈動畫
5. 重新整理 → IndexedDB 資料保留

## 建置

```bash
npm run build
npm run preview
```

## 部署到 Vercel

1. 將專案推送到 GitHub（或 GitLab/Bitbucket）。
2. 登入 [Vercel](https://vercel.com)，**Add New Project** → 匯入此 repo。
3. Framework Preset 選 **Vite**（或自動偵測）。
4. Build Command：`npm run build`；Output Directory：`dist`。
5. 部署完成後，所有路由由根目錄 `vercel.json` 的 rewrite 導向 `index.html`（SPA）。
6. 可選：在專案 Settings → Domains 綁定自訂網域；手機可「加入主畫面」使用 PWA manifest。

本地預覽 production 建置：

```bash
npm run build && npm run preview
```

## 專案結構

```
src/
  types/              # Task、Wish、Transaction
  lib/                # calculations、storage、format、utils
  store/              # Zustand + 防抖持久化
  hooks/              # useBalance、useTodayTasks、useJustUnlockedWishId
  context/            # RewardProvider（burst + toast）
  components/
    layout/           # AppShell、TabNav
    dashboard/        # BalanceHero、AnimatedCounter、NearestWishCard
    todo/             # QuickAddInput、TaskList
    wish/             # WishCard、Dialogs
    effects/          # Toaster
    ui/               # shadcn 元件
  pages/              # 三 Tab 頁面
public/
  manifest.webmanifest
  favicon.svg
vercel.json
```
