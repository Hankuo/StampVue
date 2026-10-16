# PRD: PWA 一鍵產生 Chrome 桌面捷徑與安裝功能 (One-Click Chrome Desktop Shortcut & PWA Install)

> **狀態**: 已確認 (Approved)  
> **負責人 / 作者**: Antigravity (資深架構師)  
> **建立日期**: 2026-10-16  
> **目標版本 / 里程碑**: v1.1.0  

---

## 1. 背景與目標 (Background & Objectives)

### 1.1 問題陳述 (Problem Statement)
目前 StampVue Web App 使用者在電腦（特別是 Google Chrome 環境）或行動裝置上使用時，每次都需要透過瀏覽器開啟網址或書籤。
使用者期望能在網頁上一鍵點擊「產生桌面捷徑」或「安裝為桌面應用程式」，以便直接從桌面或工作列雙擊秒開，並具備如原生獨立應用程式般的無網址列沉浸式工作台體驗。

### 1.2 目標與預期效益 (Goals & Value Proposition)
1. **一鍵觸發原生安裝**：支援 Chrome 原生 `beforeinstallprompt` 事件，使用者在 StampVue 工具列點擊「建立桌面捷徑」後，直接彈出 Chrome 原生桌面捷徑安裝視窗。
2. **全環境降級與導引支援 (Graceful Degradation)**：
   - 若使用者瀏覽器已安裝、或是已手動關閉過原生提示、或在不支援 `beforeinstallprompt` 的瀏覽器（如舊版或特殊設定）中，提供「一鍵下載 Windows 捷徑 (.url)」及「Chrome 內建手動建立步驟圖解」，確保 100% 都有解決方案。
3. **無網址列原生體驗**：以 PWA Standalone 模式執行，去除多餘的網址列與分頁標籤，最大化印章編輯與相機拍攝的工作視野。
4. **離線與資源快取 (Service Worker)**：靜態資源具備離線快取能力，提高二次造訪之載入效能。

---

## 2. 使用者故事 (User Stories)

| ID | 身為 (As a...) | 我希望 (I want to...) | 以便 (So that...) | 優先級 (P0/P1/P2) |
|---|---|---|---|---|
| US-01 | 一般使用者 (Chrome) | 點擊網頁上的「建立桌面捷徑」按鈕 | 直接由 Chrome 彈出確認視窗，一鍵將 StampVue 放到電腦桌面 | P0 |
| US-02 | 桌面應用使用者 | 從桌面捷徑開啟 StampVue | 擁有獨立視窗無網址列的類原生軟體體驗 | P0 |
| US-03 | 已安裝之使用者 | 在已開啟的 PWA 視窗中 | 按鈕狀態自動切換為「已安裝為桌面應用」或隱藏，避免重複觸發 | P1 |
| US-04 | 非 Chrome 或不支援環境使用者 | 點擊按鈕時 | 獲得替代方案（一鍵下載 Windows `.url` 檔案或圖文步驟教學） | P1 |
| US-05 | 桌面捷徑曾被刪除之使用者 | 在瀏覽器中再次點擊建立捷徑 | 清楚理解 Chrome 狀態並獲取一鍵秒級還原捷徑的方案 | P0 |

---

## 3. 功能範疇 (Scope)

### 3.1 包含項目 (In Scope)
- [x] 提供標準 `manifest.webmanifest`（包含名稱、圖示、啟動 URL、獨立視窗主題色等配置）。
- [x] 提供高畫質 App 圖示（SVG 及標準 192x192、512x512 尺寸）。
- [x] 註冊輕量級 Service Worker (`sw.js`)，符合 Chrome PWA 安裝資格。
- [x] 建立 `usePwaInstall` / `pwaInstall` 工具模組，監聽並管理 `beforeinstallprompt`、`appinstalled` 及獨立視窗檢測 (`standalone`)。
- [x] 整合 `navigator.getInstalledRelatedApps()` 偵測瀏覽器已安裝但桌面捷徑遺失之情境。
- [x] 於 StampVue 工作台右上角整合「📲 建立桌面捷徑」按鈕與回饋導引彈窗 (`InstallShortcutModal.vue`)。
- [x] 支援 Windows `.url` 捷徑一鍵下載作為備選降級方案與秒級還原方案。

### 3.2 不包含項目 (Out of Scope / Non-Goals)
- 本次迭代不涉及後端資料庫或雲端推播通知 (Push Notifications)。
- 不強制要求完全無網路下的全站動態更新（保持輕量快取即可）。

---

## 4. 驗收標準 (Acceptance Criteria - AC)

### AC-01: Chrome PWA 一鍵原生安裝
- **Given** 使用者使用 Google Chrome 訪問 StampVue，且瀏覽器觸發 `beforeinstallprompt`
- **When** 使用者點擊「建立桌面捷徑」按鈕
- **Then** Chrome 跳出原生「安裝 StampVue」確認對話框；使用者點擊「安裝」後，系統桌面與開始功能表建立「StampVue」捷徑，且網頁按鈕狀態更新為「已安裝」。

### AC-02: 獨立視窗 Standalone 模式檢測
- **Given** 使用者自桌面捷徑開啟 StampVue
- **When** 應用程式初始化
- **Then** 檢測為 Standalone 模式，頂部不顯示「建立捷徑」之推廣按鈕，工作空間最大化。

### AC-03: 備選下載與教學彈窗
- **Given** 使用者環境未能觸發原生 prompt（如非支援環境）
- **When** 使用者點擊按鈕
- **Then** 彈出「建立桌面捷徑」專屬對話窗，提供一鍵下載 Windows 捷徑 (.url) 功能與 Chrome 手動指引。

### AC-04: 捷徑移除與重複安裝狀態自適應 (Restoration Adaptation)
- **Given** 使用者曾安裝過 StampVue，但刪除了桌面捷徑或處於 Chrome 冷卻期
- **When** 使用者再次點擊「建立桌面捷徑」
- **Then** 系統清楚提示「偵測到您可能已在 Chrome 安裝過 StampVue」，並優先提供「1 秒下載 Windows 捷徑直接放回桌面」或「開啟 chrome://apps 重新建立捷徑」之解法，消除流程變化的困惑。
