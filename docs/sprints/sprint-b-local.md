# Sprint B — 本地開發（視覺／設定／日記／日期篩選）

> **範圍**：僅本地驗證；不部署、不 push（除非用戶另行要求）。**不含 Streak**。

## PM 需求摘要

### A. 視覺／音效
| ID | 需求 | 驗收 |
|----|------|------|
| A1 | 入帳時金幣從操作點飛向底部 Tab「撲滿」或撲滿頁餘額錨點 | 可見軌跡終點在撲滿圖示／餘額區 |
| A2 | 入帳短促「叮」音效 | 在 **submit 手勢內** 觸發（符合 iOS 政策） |
| A3 | 設定頁 `settings.soundEnabled` 靜音開關 | 關閉後入帳無聲；UI 說明預設為 **關閉** |

### B. 大任務／小任務（回顧 Tab QuickAdd）
| ID | 需求 | 驗收 |
|----|------|------|
| B1 | 可選小任務／大任務 | 小任務預設 +`smallTaskReward`（10）；大任務 +`bigTaskReward`（30） |
| B2 | `logCompletedTask` 支援 `rewardAmount` 或 `taskSize` | Ledger `amount` 與 `task.reward` 一致 |
| B3 | 撤銷 | 按該筆實際 `reward` 扣回 |

### C. 設定頁
| ID | 需求 | 驗收 |
|----|------|------|
| C1 | 可調小／大任務獎勵（正整數，上限 500） | 改後 **新任務** 用新金額 |
| C2 | 音效開關 | 見 A3 |
| C3 | `diaryCountsAsTask`（預設 false） | 見 E |
| C4 | 釘選願望 | 維持願望 Tab，不強制搬至設定 |

### D. 每日記錄 + 日期篩選（回顧 Tab）
| ID | 需求 | 驗收 |
|----|------|------|
| D1 | 不在「今日」視圖無限列出全部歷史 | 列表僅所選日期 |
| D2 | 日期選擇器（預設今天，可選過去） | `isTaskOnLocalDay` / `scheduledDate` |
| D3 | 新增任務 `scheduledDate` = 所選日期（本地 `yyyy-MM-dd`） | 非 UTC slice |

### E. 日記
| ID | 需求 | 驗收 |
|----|------|------|
| E1 | `JournalEntry { id, date, content, createdAt, updatedAt, creditedTaskId? }` 存 AppData | 重新整理後仍在 |
| E2 | 回顧 Tab：所選日期對應「當日日記」，可編輯、debounce 自動儲存 | 內容持久化 |
| E3 | `diaryCountsAsTask === true` 時，**首次**儲存非空日記觸發一次入帳（`smallTaskReward`） | **同日僅一次**；UI 標示已入帳 |
| E4 | `diaryCountsAsTask === false` | 儲存日記不入帳 |

### 產品行為說明（日記入帳）
- 開啟「日記完成算任務」後：使用者於所選日期寫入並儲存非空日記 → 系統建立一筆標題為「日記完成」的任務並入帳 `smallTaskReward`。
- 同一 `date` 已有 `creditedTaskId` 時，後續編輯不再入帳。
- 撤銷該筆任務會扣回對應金額；日記 UI 應反映是否仍有关联入帳（以 task 是否存在且已完成為準）。

---

## QA 驗收清單

- [x] 金幣飛向撲滿可見
- [x] 音效開/關有效
- [x] 大/小任務入帳金額正確、撤銷對帳
- [x] 設定頁改金額後新任務生效
- [x] 換日期只看到該日任務
- [x] 日記儲存持久化；diaryCountsAsTask 開/關行為正確
- [x] 無 Streak 程式碼
- [x] 未 push 遠端

---

## QA 結果摘要

**驗證環境**：本地 `npm run dev` + `npm run build`（2026-06-04）

| 項目 | 結果 | 備註 |
|------|------|------|
| 金幣飛向撲滿可見 | ✅ | `CoinBurst` 終點為 TabNav「撲滿」按鈕 `getBoundingClientRect` |
| 音效開/關有效 | ✅ | 預設關閉；`submit` / 日記 debounce 儲存內 `unlockAudioFromGesture` + Web Audio 叮聲 |
| 大/小任務入帳、撤銷對帳 | ✅ | `taskSize` → `reward`；撤銷 `-task.reward` |
| 設定改金額後新任務生效 | ✅ | `updateSettings` + QuickAdd 讀最新 settings |
| 換日期只看到該日任務 | ✅ | `type="date"` + `useTasksForDay` / `isTaskOnLocalDay` |
| 日記持久化；diary 開關 | ✅ | `journalEntries` 存 IndexedDB；`creditedTaskId` 同日一次 |
| 無 Streak 程式碼 | ✅ | 僅 PRD 競品表格提及 |
| 未 push 遠端 | ✅ | 本輪未執行 `git push` |

**本地驗證步驟**

1. `npm run dev` → 開瀏覽器。
2. **回顧**：切小/大任務完成一筆 → 金幣飛向底部「撲滿」；設定開音效後再完成一筆聽叮聲。
3. **設定**：改小 15 / 大 40 → 回回顧新增 → 金額正確；撤銷後餘額回復。
4. 日期選昨天 → 列表僅該日；新增任務 `scheduledDate` 為所選日。
5. 日記輸入文字 → 重整仍在；開「日記算任務」首次儲存入帳、顯示已入帳徽章。
6. `npm run build` 已通過。

---

## UX 修訂（2026-06-04）

見 [sprint-b-ux-revision.md](./sprint-b-ux-revision.md)：移除金幣動畫、改刪除語意、日記收合、非撲滿 Tab 頂部 HUD。
