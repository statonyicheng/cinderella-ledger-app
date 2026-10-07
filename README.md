# 仙度瑞拉記帳 Cinderella Ledger

仙度瑞拉 Cinderella Beauty Salon 的店內記帳系統。

- **Google 帳號登入**：只有白名單上的 Gmail 能進來，系統不存任何密碼
- **Google 試算表就是帳本**：每一筆收入、成本一送出就寫進試算表，月底直接在 Sheet 裡對帳
- **手機優先**：底部導覽列，站在工作檯邊就能記一筆

| 頁面 | 功能 |
|---|---|
| 月曆 | 本月營收／成本／淨利、每日收支、點日期看明細、記一筆 |
| 紀錄 | 依類型、關鍵字、日期篩選；編輯、刪除；匯出 CSV |
| 報表 | 任選月份：營收、淨利、服務人次、平均客單、熱門服務、付款方式、支出分類 |
| 許願池 | 員工提出系統改善建議，記在試算表裡給店長看 |
| 設定 | 店名、服務項目、付款方式、成本類型；開啟試算表 |

技術：Next.js 16（App Router、Server Actions）、Tailwind CSS v4、`jose`（session 與服務帳號簽章）、Google Sheets REST API。

---

## 先看看：示範模式（不需要任何設定）

```bash
npm install
npm run demo
```

打開 http://localhost:3100。會自動用「示範帳號」登入，帳本放在記憶體裡、附幾筆假資料，重開就清空，不會寫到任何地方。

示範模式**只在 `npm run demo`（開發模式）有效**。`next build`、`next start` 和 Vercel 上線版本一律是 production，就算誤設 `LEDGER_DEMO=1` 也不會繞過登入。

---

## 第一次設定

全部做完約 20 分鐘。你需要一個 Google 帳號（建議用店裡的帳號，之後試算表和雲端專案都歸它）。

### 1. 建立試算表

1. 到 https://sheets.new 開一份新的空白試算表，命名例如「仙度瑞拉帳本」
2. 從網址複製 ID：`https://docs.google.com/spreadsheets/d/`**`這一段`**`/edit` → 填進 `GOOGLE_SHEET_ID`

分頁不用自己建：系統第一次讀寫時會自動建好「收入、收入明細、成本、服務項目、付款方式、成本類型、工作室設定、許願池」八個分頁和標題列。已存在的分頁和資料絕對不會被動到。

### 2. 建立 Google Cloud 專案並啟用 Sheets API

1. 到 https://console.cloud.google.com/ ，左上角「選取專案」→「新增專案」，名稱例如 `cinderella-ledger`
2. 到「API 和服務」→「程式庫」，搜尋 **Google Sheets API** →「啟用」

### 3. 建立服務帳號（讓系統能寫試算表）

1. 「IAM 與管理」→「服務帳號」→「建立服務帳號」，名稱例如 `ledger-writer`，角色可以不選
2. 點進剛建立的服務帳號 →「金鑰」→「新增金鑰」→「JSON」，會下載一個 `.json` 檔
3. 打開 JSON 檔：
   - `client_email` → 填進 `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → 整段（含 `-----BEGIN…` 和 `\n`）填進 `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`，用雙引號包起來
4. **回到第 1 步的試算表** →「共用」→ 貼上 `client_email` → 權限選「編輯者」→ 傳送

> ⚠️ 這個 JSON 檔等同試算表的鑰匙。不要傳到 LINE、不要放進 GitHub、不要寄信。填完環境變數後可以刪掉，需要時再到 Google Cloud 產生新的金鑰。

### 4. 建立 Google 登入（OAuth 用戶端）

1. 「API 和服務」→「OAuth 同意畫面」：使用者類型選「外部」，填應用程式名稱「仙度瑞拉記帳」和你的 Email，其他可略過
   - 在「目標對象」把狀態設為「正式版」，或把每位員工的 Gmail 加進「測試使用者」
2. 「API 和服務」→「憑證」→「建立憑證」→「OAuth 用戶端 ID」
   - 應用程式類型：**網頁應用程式**
   - 已授權的重新導向 URI，**兩個都加**：
     - `http://localhost:3000/api/auth/callback`
     - `https://你的網址.vercel.app/api/auth/callback`（第 6 步上線後才知道網址，回來補）
3. 建立後的「用戶端 ID」和「用戶端密碼」→ 填進 `GOOGLE_OAUTH_CLIENT_ID`、`GOOGLE_OAUTH_CLIENT_SECRET`

### 5. 本機試跑

```bash
cp .env.example .env.local      # Windows PowerShell：Copy-Item .env.example .env.local
```

填好 `.env.local`，然後產生 `AUTH_SECRET`：

```bash
openssl rand -base64 32
```

`ALLOWED_EMAILS` 填上要能登入的 Gmail（逗號分隔），接著：

```bash
npm run dev
```

打開 http://localhost:3000 ，用白名單裡的 Gmail 登入，記一筆收入，再回試算表看有沒有出現。

### 6. 上線到 Vercel

1. 到 https://vercel.com 用 GitHub 帳號登入 →「Add New」→「Project」→ 選這個 repo →「Import」
2. 展開「Environment Variables」，把 `.env.local` 裡的每一項都加進去（`APP_URL` 先留空）
3. 「Deploy」。完成後會拿到網址，例如 `https://cinderella-ledger.vercel.app`
4. 收尾兩件事：
   - Vercel：把 `APP_URL` 設成這個網址 → 重新部署一次
   - Google Cloud：回第 4 步，把 `https://…vercel.app/api/auth/callback` 加進重新導向 URI

之後每次 push 到 GitHub 的 `main`，Vercel 會自動重新部署。

---

## 日常管理

- **新增／移除員工**：改 Vercel 的 `ALLOWED_EMAILS` 再重新部署。移除的人**下一次操作就會被登出**，不用等 cookie 過期
- **對帳**：直接開試算表。「收入」一列一筆來客，「收入明細」一列一個服務項目，「成本」一列一筆支出。每列都記錄建立者和時間
- **備份**：試算表本身有 Google 的版本紀錄（檔案 → 版本紀錄）。也可以在「紀錄」頁或「設定」頁下載 CSV
- **在試算表裡改資料**：可以，但**不要改 A 欄的 ID**，也不要改第一列標題，系統靠它們找資料

## 計算方式

- **淨利** = 實收金額 − 服務耗材成本 − 營運支出
- **實收金額**是折扣後客人實際付的錢，所以折扣只做統計，不會再扣一次
- 沒有記錄的成本不會被估算

## 安全設計

- Google OAuth 登入搭配 `state` 防 CSRF；白名單在**每一次請求**都重新檢查
- Session 是簽章過的 httpOnly cookie（`jose`，HS256，7 天）
- 每個 server action 寫入前都重新驗證身分（`src/lib/dal.ts`）；`src/proxy.ts` 只做快速導向
- 寫入試算表一律用 `RAW` 模式：客人姓名填 `=公式` 也只會存成文字，不會被執行
- CSV 匯出會把 `= + - @` 開頭的儲存格加上 `'`，防止在 Excel 被當成公式

## 品牌素材

原始檔放在 `brand-source/`，網站用的版本都由腳本產生，**不要手動修改 `public/brand/` 裡的檔案**：

| 產出 | 用途 | 怎麼來的 |
|---|---|---|
| `public/brand/crest.png` | 頁首徽章 | 從 logo 裁出皇冠＋盾牌＋花紋，抽出墨線、底色轉透明 |
| `public/brand/logo-plate.webp` | 登入頁 | 完整 logo 沿圓盤裁成圓形，去掉外圍大理石方角 |
| `public/brand/nails.webp` | 登入頁照片 | 作品照轉 WebP |
| `src/app/icon.png`、`apple-icon.png` | 瀏覽器分頁圖示、手機主畫面圖示 | 徽章放在圓盤底色上 |

頁首的「仙度瑞拉 / Cinderella」是用字型排的，不是從 logo 裁的：logo 裡的字縮到頁首大小會糊掉。

logo 改版時：換掉 `brand-source/logo.jpg`（或 `nails.jpg`），然後執行

```bash
node scripts/brand-assets.mjs
```

如果新 logo 的構圖不同，要重新量 `scripts/brand-assets.mjs` 開頭的 `PLATE`（圓盤位置）和 `CREST`（徽章範圍）。

## 開發指令

```bash
npm run demo        # 示範模式（port 3100）
npm run dev         # 開發模式（需要 .env.local）
npm run check       # lint + 型別檢查 + build
```
