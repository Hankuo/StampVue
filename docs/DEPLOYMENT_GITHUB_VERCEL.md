# StampVue - 永久免費公開上架指南 (GitHub Pages & Vercel)

> **專案**：StampVue (印章拍照擷取與去背系統)  
> **特色**：100% 純前端 Canvas 2D + TypedArray 離線運算引擎，不需後端伺服器即可在瀏覽器內 60fps 去背與鏡頭拍照。  
> **優勢**：相較於 Google Colab 會在閒置 60~90 分鐘後自動關機中斷，**GitHub Pages 與 Vercel 提供 24/7 永久免費在線、全球 CDN 加速與合法 HTTPS**。

---

## 📊 方案對比速查

| 評比項目 | Google Colab | 🐙 GitHub Pages | ▲ Vercel (強烈推薦) |
|---|:---:|:---:|:---:|
| **持續在線時間** | ⚠️ 閒置 60~90 分鐘自動斷線 | 🟢 **24/7 永久免費在線** | 🟢 **24/7 永久免費在線** |
| **HTTPS 支援 (相機取景必要)** | 需靠 Cloudflare Tunnel 穿透 | 🟢 **自帶合格 HTTPS** | 🟢 **自帶合格 HTTPS** |
| **連線速度** | 依賴穿透通道，延遲較高 | 🟢 全球 GitHub CDN | 🟢 全球 Edge Network（極速） |
| **自訂網域名稱 (Custom Domain)** | ❌ 不支援 | 🟢 支援 | 🟢 支援（含免費 SSL 證書） |
| **部署便利度** | 每次使用都需開啟筆記本執行 | 🟢 `git push` 全自動更新 | 🟢 `git push` 全自動更新 |

---

## 方案一：使用 GitHub Pages 發布 (完全免費、免額外帳號)

專案中已內建 GitHub Actions 自動化工作流程檔案：[deploy.yml](file:///d:/AI%20Agent/StampVue/.github/workflows/deploy.yml)。

### 步驟 1：在 GitHub 建立新倉庫 (Repository)
1. 登入 [GitHub](https://github.com/)，點擊右上角「**New repository**」。
2. Repository name 輸入 `StampVue`（設定為 **Public** 公開倉庫）。
3. 其餘選項（README、.gitignore）保持不勾選，點擊「**Create repository**」。

### 步驟 2：將本地程式碼推送至 GitHub
在 VSCode 或 PowerShell 終端機中，切換至專案根目錄執行以下指令：

```bash
# 1. 初始化 Git 倉庫
git init

# 2. 加入所有檔案並建立初始提交
git add .
git commit -m "feat: initial release of StampVue with GitHub Pages workflow"

# 3. 指定 main 分支
git branch -M main

# 4. 綁定您的 GitHub 倉庫 (請替換 <您的GitHub帳號>)
git remote add origin https://github.com/<您的GitHub帳號>/StampVue.git

# 5. 推送程式碼
git push -u origin main
```

### 步驟 3：在 GitHub 設定中開啟 GitHub Pages
1. 進入您的 GitHub `StampVue` 倉庫頁面，點擊上方的 **Settings**（設定）。
2. 在左側選單點擊 **Pages**。
3. 在 **Build and deployment** 下方的 **Source**，切換為 **`GitHub Actions`**。
4. 點擊頂部的 **Actions** 標籤頁，您會看到名為 `Deploy StampVue to GitHub Pages` 的工作流程正在自動執行，約 1 分鐘後便會完成！
5. 部署完成後，您的專屬永久公開網址即為：
   ```
   https://<您的GitHub帳號>.github.io/StampVue/
   ```

---

## 方案二：使用 Vercel 發布 (最推薦，速度最快、支援預覽)

專案根目錄已為您建立 [vercel.json](file:///d:/AI%20Agent/StampVue/vercel.json)，支援零配置自動建置！

### 步驟 1：登入 Vercel
1. 開啟 [Vercel 官網 (https://vercel.com)](https://vercel.com)。
2. 點擊 **Sign Up** 或 **Log In**，選擇 **Continue with GitHub** 直接登入。

### 步驟 2：匯入專案並發布
1. 在 Vercel 控制台首頁，點擊右上角 **Add New...** ➜ **Project**。
2. 在 GitHub 倉庫列表中找到剛剛推送的 **`StampVue`**，點擊旁邊的 **Import** 按鈕。
3. 進入設定畫面，因專案已有 `vercel.json`，所有建置設定均已自動配置完畢。
4. 直接點擊底部的 **Deploy** 按鈕！
5. 約 30 秒後，畫面上會噴出彩帶，並生成專屬永久網址：
   ```
   https://stampvue.vercel.app (或類似自訂網址)
   ```

---

## 🔄 未來如何更新網站？

日後只要您在本地端對 StampVue 進行了任何功能更新或修改：
```bash
git add .
git commit -m "fix: 優化印章影像處理演算法"
git push
```
推送完成後，**GitHub Pages 與 Vercel 都會自動監聽並重新建置發布**，您不需要做任何額外手動操作！
