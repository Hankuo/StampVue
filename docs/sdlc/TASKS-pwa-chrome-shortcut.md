# Task Checklist & Progress Tracker: PWA 一鍵產生 Chrome 桌面捷徑與安裝

> **關聯 PRD**: [PRD 文件連結](file:///docs/sdlc/PRD-pwa-chrome-shortcut.md)  
> **關聯 Tech Spec**: [Tech Spec 文件連結](file:///docs/sdlc/SPEC-pwa-chrome-shortcut.md)  
> **當前進度**: 5 / 5 完成 (100%)  

---

## 任務清單 (Task Breakdown)

### Phase 1: PWA 靜態資源與 Service Worker 建立
- [x] **Task 1.1**: 於 `frontend/public/` 建立 `favicon.svg`、`icon-192.png`、`icon-512.png` 應用圖示
- [x] **Task 1.2**: 建立 `frontend/public/manifest.webmanifest` 並於 `frontend/index.html` 正確引入
- [x] **Task 1.3**: 建立輕量級 `frontend/public/sw.js` 並於 `frontend/src/main.ts` 註冊 Service Worker

### Phase 2: 控制器邏輯與捷徑生成 (TDD/Logic)
- [x] **Task 2.1**: 實作 `frontend/src/utils/pwaInstall.ts`（包含事件監聽、prompt 呼叫、狀態檢測、Windows `.url` 檔案動態生成與下載）

### Phase 3: UI 元件實作與整合
- [x] **Task 3.1**: 建立 `frontend/src/components/InstallShortcutModal.vue`（提供降級下載與 Chrome 手動指引）
- [x] **Task 3.2**: 建立 `frontend/src/components/InstallShortcutButton.vue`，並整合入 `frontend/src/App.vue` 頂部導航列

### Phase 4: 品質驗證與測試 (Quality Gate)
- [x] **Task 4.1**: 執行 `npm run typecheck` 與 `npm run build` 確認零錯誤
- [x] **Task 4.2**: 驗證 Service Worker、Manifest 及點擊互動
- [x] **Task 4.3**: 完成 QUALITY_GATE 報告與文檔交付
