# Git Workflow & Commit Guidelines - 版本控制與提交規範

> 本規範確立專案的 Git 分支策略與 Conventional Commits 提交訊息標準。

---

## 1. Commit 訊息標準 (Conventional Commits)

格式統一為：
```
<type>(<scope>): <short summary>

[optional body: 詳細說明改動原因與背景]

[optional footer: 關聯 issue 或 breaking changes]
```

### Type 類型分類：
- `feat`: 新增功能 (A new feature)
- `fix`: 修復缺陷 (A bug fix)
- `refactor`: 代碼重構 (Neither fixes a bug nor adds a feature)
- `docs`: 文檔變更 (Documentation only changes)
- `test`: 新增或修改測試 (Adding missing tests or correcting existing tests)
- `chore`: 建置流程或輔助工具變更 (Build process or auxiliary tool changes)
- `perf`: 效能提升 (A code change that improves performance)
- `style`: 代碼格式微調，不影響運行邏輯 (White-space, formatting, semicolons, etc)

### 範例：
```
feat(auth): add google oauth2 login flow

Implement Google OAuth2 token exchange and session persistence.
Closes #12
```

---

## 2. 分支命名規範 (Branching Model)

- 主分支：`main`（始終保持可部署的穩定版本）
- 開發分支：`dev`（日常整合測試分支）
- 功能分支：`feature/<feature-name>` (例如 `feature/user-auth`)
- 修復分支：`fix/<bug-name>` (例如 `fix/login-redirect-loop`)
- 重構分支：`refactor/<component-name>` (例如 `refactor/state-store`)

---

## 3. 提交前的必備檢查 (Pre-commit Checklist)

在每次 `git commit` 之前，Agent 必須確認：
1. [ ] 沒有將無關的暫存檔、log、快取、`.env` 提交進版本控制。
2. [ ] 運行本地測試與 linter 確認全部通過。
3. [ ] Commit 訊息清晰準確，明確說明本次提交的目的。
