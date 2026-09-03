# Coding Standards & Best Practices - 代碼品質與架構規範

> 本規範確立代碼編寫的技術底線，防止在 Vibe Coding 過程中累積技術債與隨機生成品質不佳的代碼。

---

## 1. 核心編碼原則 (Core Principles)

1. **單一職責 (Single Responsibility Principle - SRP)**:
   - 每個函式或類別只專注做好一件事。函式長度盡量維持在 50 行以內。
2. **防禦性編程 (Defensive Programming)**:
   - 對所有外部輸入（使用者表單、API 回應、URL 參數、環境變數）進行型別與格式驗證。
   - 針對 `null`、`undefined`、空字串、空陣列等邊界狀況給予合理的預設值或優雅降級。
3. **無死代碼與無多餘註解 (No Dead Code / Obsolete Comments)**:
   - 不留註解掉的整段代碼（使用 Git 歷史管理）。
   - 代碼命名應具備高度自解釋性，註解專注於解釋「為什麼 (Why)」而非「做什麼 (What)」。

---

## 2. 錯誤處理與日誌 (Error Handling & Logging)

1. **嚴禁空 Catch / Except**:
   ```typescript
   // ❌ 嚴禁做法
   try {
     doSomething();
   } catch (e) {}

   // ✅ 正確做法
   try {
     doSomething();
   } catch (error) {
     logger.error('Failed to execute doSomething', { error, context: { ... } });
     throw new CustomDomainException('Operation failed due to...', { cause: error });
   }
   ```
2. **結構化錯誤與分級日誌**:
   - 使用標準日誌等級 (`debug`, `info`, `warn`, `error`)。
   - 生產環境中避免隨意使用未經封裝的 `console.log`。

---

## 3. 型別與介面設計 (Typing & Interfaces)

1. **避免使用 `any` 或無型別約束**:
   - TypeScript 專案必須開啟 `strict: true`，禁止濫用 `any`（應使用 `unknown` 搭配 Type Guard）。
   - Python 專案應使用 `typing` / Pydantic 模型定義資料結構。
2. **介面命名與契約**:
   - 介面與型別定義應集中管理（如 `src/types/` 或模組內同層 `*.types.ts`）。
   - 對外部 API 與資料庫返回資料建立 DTO (Data Transfer Object) 或 Schema 驗證（如 Zod）。

---

## 4. 安全規範 (Security Guidelines)

1. **機密資料保護**:
   - 絕對不可在代碼中寫死 API Key、密碼、Token、資料庫連線字串。
   - 使用 `.env` 與 `.env.example` 規範環境變數。
2. **防範常見漏洞 (OWASP Top 10)**:
   - SQL Injection：一律使用 ORM 或參數化查詢。
   - XSS：正確跳脫 HTML 或使用現代前端框架的內建轉義機制。
   - CSRF / CORS：配置嚴格的來源存取控制。

---

## 5. 測試規範 (Testing Standards)

1. **單元測試 (Unit Tests)**:
   - 覆蓋核心商業邏輯與複雜演算法。
   - 必須測試正常路徑 (Happy Path) 與異常路徑 (Unhappy Path)。
2. **測試獨立性**:
   - 每個測試案例應相互獨立，不可依賴特定執行順序。
   - 外部服務（網路、資料庫）應使用 Mock 或測試容器隔離。
