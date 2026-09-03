# StampVue - Google Colab 公開上架與部屬指引

> **專案**：StampVue (印章拍照擷取與去背系統)  
> **適用場景**：在 Google Colab 上免費用戶端運行，並產生公開 HTTPS 網址供任何人與行動裝置使用。

---

## 1. 核心技術原理 (Why Cloudflare Tunnel?)

要在 Google Colab 上公開運行 Web 應用程式並正常使用**相機鏡頭即時拍攝**功能，必須滿足以下條件：
1. **必須為合法 HTTPS 協定**：瀏覽器之 W3C 規範規定，存取攝影機鏡頭（`navigator.mediaDevices.getUserMedia`）在非 localhost 環境下**強制要求 HTTPS**，否則會直接被瀏覽器阻擋。
2. **無需複雜註冊與 Token**：傳統 ngrok 需要先申請帳號並取得 Authtoken，且免費版有流量限制。
3. **最佳解法：Cloudflare Quick Tunnel (`cloudflared`)**：
   - 完全免費、免註冊帳號、免 API Token。
   - 自帶合格且受各大瀏覽器信任的 SSL/TLS 憑證 (`https://*.trycloudflare.com`)。
   - 任何人點擊連結即可直接開啟，無需輸入驗證碼或密碼。

---

## 2. 快速一鍵上架步驟 (Step-by-Step)

專案根目錄已為您準備好現成的筆記本檔案：[StampVue_Colab.ipynb](file:///d:/AI%20Agent/StampVue/StampVue_Colab.ipynb)。

### 步驟 1：開啟 Google Colab
1. 打開瀏覽器至 [Google Colab (https://colab.research.google.com/)](https://colab.research.google.com/)。
2. 點擊「**上傳** (Upload)」標籤頁，選擇本專案根目錄下的 `StampVue_Colab.ipynb` 檔案上傳。

---

### 步驟 2：執行環境安裝（第 1 區塊）
點擊執行第一格代碼，自動安裝 Node.js 20 LTS 與 Cloudflare Tunnel CLI：
```bash
!curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
!sudo apt-get install -y nodejs
!wget -q -nc https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
!sudo dpkg -i cloudflared-linux-amd64.deb
```

---

### 步驟 3：取得 StampVue 原始碼（第 2 區塊）
您可以選擇以下兩種方式之一：

#### 方案 A（推薦）：直接透過 GitHub Clone
將專案推送到您的 GitHub 後，在 Colab 中執行：
```python
!git clone https://github.com/您的帳號/StampVue.git /content/StampVue
```

#### 方案 B：由本機壓縮上傳
1. 在本機將 `StampVue` 資料夾打包為 `StampVue.zip`（建議排除 `node_modules` 與 `.git` 以加快上傳速度）。
2. 在 Colab 左側點擊「📁 檔案」圖示，將 `StampVue.zip` 拖曳上傳至 `/content/`。
3. 執行筆記本第 2 格解壓縮：
```python
!unzip -q /content/StampVue.zip -d /content/StampVue
```

---

### 步驟 4：安裝前端依賴、建置並啟動公開穿透（第 3 區塊）
執行第三格代碼：
```python
import subprocess
import time
import re
from IPython.display import display, HTML

%cd /content/StampVue/frontend
!npm install
!npm run build

# 1. 背景啟動 Vite 預覽伺服器 (5173 port)
server_process = subprocess.Popen(
    ["npx", "vite", "preview", "--port", "5173", "--host", "0.0.0.0"],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)
time.sleep(2)

# 2. 背景啟動 Cloudflare Tunnel
tunnel_process = subprocess.Popen(
    ["cloudflared", "tunnel", "--url", "http://localhost:5173"],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

public_url = None
start_time = time.time()

while time.time() - start_time < 30:
    line = tunnel_process.stderr.readline()
    if not line:
        continue
    match = re.search(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com', line)
    if match:
        public_url = match.group(0)
        break

if public_url:
    display(HTML(f"""
    <div style='background:#1e293b;border:2px solid #ef4444;border-radius:12px;padding:20px;color:white;'>
        <h3 style='color:#f87171;'>🎉 StampVue 已成功公開發布！</h3>
        <p>公開 HTTPS 網址：<a href='{public_url}' target='_blank' style='color:#60a5fa;font-weight:bold;'>{public_url}</a></p>
    </div>
    """))

# 保持 Cell 運行中
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    server_process.kill()
    tunnel_process.kill()
```

執行後輸出格中會立即顯示如：
`👉 https://random-name-xxx.trycloudflare.com`

點擊該網址，即可在手機、平板或任意電腦上公開使用 StampVue！

---

## 3. 重要注意事項與替代方案評估

### Colab 的使用限制
- **閒置中斷 (Idle Timeout)**：Google Colab 免費版在瀏覽器關閉或閒置約 60~90 分鐘後會自動回收執行階段，適合臨時演示、快速測試或教學分享。
- **最長執行時間**：單次工作階段上限為 12 小時。

### 🌟 永久公開發布的更佳方案：GitHub Pages / Vercel
由於 StampVue 核心具備 **100% 純前端 Canvas 2D + TypedArray 離線影像處理引擎**（所有去背、陰影消除、裁切框拍攝都在使用者本機瀏覽器內 60fps 運算，完全不需要後端 Node.js 伺服器）：
- 您可以直接將 `frontend/dist` 部屬至 **GitHub Pages** 或 **Vercel** / **Cloudflare Pages**。
- **好處**：
  - 完全免費、24 小時永久在線、不會斷線。
  - 自帶全球 CDN 與正式 HTTPS。
  - 不耗費 Colab 運算資源。
