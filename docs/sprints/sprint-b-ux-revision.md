# Sprint B UX 修訂（本地）

> 依用戶回饋調整「廉價感」動畫、刪除語意、日記佔版、全域 HUD。不 push。

## 變更摘要

| 項目 | 變更 |
|------|------|
| 動畫 | 移除 `CoinBurst` 金幣軌跡；`RewardContext` 僅保留 Toast |
| 入帳回饋 | 非撲滿 Tab `GoalChip`：**第一行標題 → 第二行 `NT$X / Y%` → 第三行進度條**；`+NT$` 浮字綁第二行 |
| Header | Logo + 標題 `text-xl`；GoalChip 標題 `text-sm/semibold`、金額 `text-xs`、進度條 `h-1.5`；左右 `gap-4`、max-w 略增 |
| 撤銷 → 刪除 | `deleteTask`：自 `tasks` 移除；已入帳則 `task_revoke` 對帳 |
| 日記 | 預設收合按鈕；展開後 3 行 textarea；仍在「今日回顧」區塊 |
| HUD | Header 左 Logo、右 `GoalChip`（**標題 → NT$/% → 進度條**）；無主目標仍「還沒設定目標喔！」+ `0%`；撲滿頁保留 `BalanceHero` |

## GoalChip 布局修訂（2025-06-04）

| 層級 | 內容 | 字級 / 樣式 |
|------|------|-------------|
| 1 | 還沒設定目標喔！ / 主目標 · 標題 | `text-sm font-semibold leading-snug` |
| 2 | NT$X / Y% | `text-xs font-semibold tabular-nums`；`+NT$` 浮字 `-top-2.5` |
| 3 | 進度條 | `h-1.5 mt-1` |

**前 → 後**：進度條在 NT$ 下方 → NT$ 移到進度條上方；標題由 `text-xs` 升為 `text-sm` 以對齊左側 tagline 層級。

## 驗證

1. `npm run build`
2. **回顧**：完成任務 → GoalChip 行浮出 `+NT$10`、餘額與 `%` 更新（無金幣）；刪除已入帳項 → Toast「已刪除」+ 退回說明
3. **日記**：預設僅按鈕；展開編輯；換日期仍綁同一 `dateKey`
4. **撲滿**：大餘額仍在；其他 Tab 見放大 Header + 右上角 `NT$X / Y%` GoalChip
5. **設定**：開音效後入帳仍有叮聲（與動畫無關）
