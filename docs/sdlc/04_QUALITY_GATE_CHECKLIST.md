# Quality Gate & Pre-Delivery Checklist - 品質閘門檢核單

> 在功能合併、提交版本控制或交付前，必須逐項核對以下檢查項目。

---

## 1. 自動化驗證 (Automated Verification)

- [ ] **單元與整合測試**: `npm test` / `pytest` 100% 通過，無略過或註解測試。
- [ ] **型別檢查**: `npx tsc --noEmit` / `mypy` 零錯誤 (Zero Type Errors)。
- [ ] **靜態代碼分析 (Linting)**: `npm run lint` / `flake8` 零錯誤與告警。
- [ ] **建置驗證 (Build Validation)**: 生產環境打包 `npm run build` 成功無警告。

---

## 2. 代碼品質與設計審查 (Code Quality & Design Review)

- [ ] **無代碼殘留 (No Slop / Dead Code)**: 已移除所有臨時 `console.log`、`print`、無用註解與除錯代碼。
- [ ] **例外處理完備**: 無空的 `catch / except` 區塊，所有外部 I/O 均有異常補獲與日誌記錄。
- [ ] **命名清晰自解釋**: 變數、函式、類別命名符合業務語意，不使用模糊縮寫 (如 `temp`, `data1`, `a`)。
- [ ] **邊界情況防護**: 針對 `null`、`undefined`、空陣列、超長輸入、特殊字元有容錯防禦。

---

## 3. 安全與隱私審查 (Security & Privacy)

- [ ] **零機密外洩**: 無寫死任何 API Key、密碼、私鑰、連線字串在代碼庫中。
- [ ] **輸入過濾與防護**: SQL 參數化、HTML 跳脫、防範 XSS / CSRF。
- [ ] **敏感資料日誌遮蔽**: 日誌中未打印使用者密碼、個資、身分證字號等隱私資訊。

---

## 4. 驗收標準對齊 (AC Alignment)

- [ ] 逐一對照 [PRD 文件](file:///docs/sdlc/01_PRD_TEMPLATE.md) 中的驗收標準 (Acceptance Criteria)，所有項目皆已落實。
- [ ] 相關說明文檔與 README 已同步更新。

---

### 簽核紀錄 (Sign-off)
- **檢核人 / Agent**:
- **檢核日期**:
- **結論**: [ ] 通過 (Passed) / [ ] 需修正 (Needs Revision)
