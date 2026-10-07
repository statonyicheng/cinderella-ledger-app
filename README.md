# 仙度瑞拉記帳 Cinderella Ledger

仙度瑞拉 Cinderella Beauty Salon 的店內記帳系統。

**網址：https://statonyicheng.github.io/cinderella-ledger-app/**

- **Google 帳號登入**：系統不存任何密碼，登入就是用 Google 帳號
- **Google 試算表就是帳本**：每一筆收入、成本一送出就寫進「仙度瑞拉帳本」試算表，月底直接在 Sheet 裡對帳
- **放在 GitHub Pages，不用伺服器**：push 到 `main` 就自動上線，免費
- **手機優先**：底部導覽列，站在工作檯邊就能記一筆

| 頁面 | 功能 |
|---|---|
| 月曆 | 本月營收／成本／淨利、每日收支、點日期看明細、記一筆 |
| 紀錄 | 依類型、關鍵字、日期篩選；編輯、刪除；匯出 CSV |
| 報表 | 任選月份：營收、淨利、服務人次、平均客單、熱門服務、付款方式、支出分類 |
| 許願池 | 員工提出系統改善建議，記在試算表裡給店長看 |
| 設定 | 店名、服務項目、付款方式、成本類型；開啟試算表、下載 CSV |

技術：Next.js 16 靜態匯出（`output: "export"`）、Tailwind CSS v4、Google Identity Services、Google Sheets REST API。

---

## 運作方式

```
員工手機 ──登入 Google──▶ 拿到「只能操作試算表」的通行證（1 小時，自動續）
   │
   └──直接寫入──▶ Google 試算表「仙度瑞拉帳本」
```

網站本身只是一堆 HTML/JS 檔，**沒有伺服器、沒有資料庫、沒有密碼**。每個人是用**自己的 Google 帳號**讀寫試算表，所以：

- **誰能用 = 試算表共用給誰。** 沒被加為「編輯者」的人，就算登入也讀不到、寫不進任何資料
- 試算表的「版本紀錄」會記下是誰改了什麼

| 項目 | 目前設定 |
|---|---|
| 試算表 | 「仙度瑞拉帳本」，擁有者 staton.yicheng@gmail.com |
| Google Cloud 專案 | `cinderella-ledger`（staton.yicheng@gmail.com） |
| OAuth 用戶端 | 「仙度瑞拉記帳 GitHub Pages」（網頁應用程式） |
| 設定檔 | `src/config.ts`（用戶端 ID、試算表 ID、員工名單） |

---

## 新增／移除員工

要讓一位員工能用，**三個地方都要加**：

1. **試算表**：開「仙度瑞拉帳本」→ 右上「共用」→ 輸入員工 Gmail → 權限選「**編輯者**」→ 傳送
2. **Google Cloud**：[Google Auth Platform → 目標對象](https://console.cloud.google.com/auth/audience?project=cinderella-ledger) →「測試使用者」→「Add users」→ 輸入員工 Gmail → Save
3. **`src/config.ts`**：把 Gmail 加進 `allowedEmails`（全小寫），commit 後 push 到 `main`

移除員工：反過來把試算表的共用拿掉即可，**立刻生效**（第 2、3 步之後有空再刪）。

> 第 3 步的名單只是讓「不是員工的人」看到清楚的提示，真正擋人的是第 1 步的試算表共用。

### 第一次登入會看到「Google 尚未驗證這個應用程式」

這是正常的。App 還在 Google 的「測試」狀態，只開放給測試使用者（上面第 2 步）。

點「**繼續**」→ 勾選「**查看、編輯、建立及刪除您的所有 Google 試算表**」→「繼續」。

> 這個權限讓網站能寫入帳本。網站只會讀寫「仙度瑞拉帳本」這一份（ID 寫死在 `src/config.ts`），而且通行證只存在這個瀏覽器分頁、關掉就消失。

要拿掉這個警告得送 Google 審核（需要隱私權政策網頁等），店內自用不需要。

---

## 對帳與備份

- **對帳**：直接開試算表。「收入」一列一筆來客，「收入明細」一列一個服務項目，「成本」一列一筆支出。每列都記錄建立者和時間
- **備份**：試算表本身有 Google 的版本紀錄（檔案 → 版本紀錄）。也可以在「紀錄」頁或「設定」頁下載 CSV
- **在試算表裡改資料**：可以，但**不要改 A 欄的 ID**，也不要改第一列標題，系統靠它們找資料
- 分頁不用自己建：系統第一次讀寫時會自動建好「收入、收入明細、成本、服務項目、付款方式、成本類型、工作室設定、許願池」八個分頁和標題列。已存在的分頁和資料絕對不會被動到

## 計算方式

- **淨利** = 實收金額 − 服務耗材成本 − 營運支出
- **實收金額**是折扣後客人實際付的錢，所以折扣只做統計，不會再扣一次
- 沒有記錄的成本不會被估算

---

## 上線（GitHub Pages）

已經設定好，**push 到 `main` 就會自動部署**（`.github/workflows/deploy-pages.yml`）：lint → 型別檢查 → build → 發布。進度看 repo 的「Actions」分頁，約 2 分鐘。

從零開始重建時：

1. GitHub repo → Settings → Pages → Source 選「**GitHub Actions**」
2. Google Cloud → Google Auth Platform → 用戶端 → 網頁應用程式 →「已授權的 JavaScript 來源」加入：
   - `https://statonyicheng.github.io`
   - `http://localhost:3000`（本機開發用）
   - 不需要「重新導向 URI」，也**不需要用戶端密碼**
3. Google Cloud → API 和服務 → 啟用 **Google Sheets API**
4. 把用戶端 ID 和試算表 ID 填進 `src/config.ts`

換 repo 名稱時，網址會變成 `https://statonyicheng.github.io/<新名稱>/`，workflow 會自動處理路徑，不用改程式。

---

## 開發

```bash
npm install
npm run demo        # 示範模式：http://localhost:3100，自動登入、帳本放記憶體、重開就清空
npm run dev         # 連真的試算表：http://localhost:3000，用你的 Google 帳號登入
npm run check       # lint + 型別檢查 + build（輸出到 out/）
```

示範模式**只在 `npm run demo`（開發模式）有效**。`npm run build` 一律是 production，部署 workflow 也會檢查，示範模式不可能出現在正式網站。

## 安全設計

- 沒有伺服器、沒有密碼、沒有金鑰：repo 和網頁裡**沒有任何秘密**（用戶端 ID 和試算表 ID 本來就是公開的識別碼）
- 存取控制 = Google 試算表共用 + OAuth 測試使用者名單，都由 Google 執行
- 通行證存在 `sessionStorage`（關掉分頁就消失），登出時會向 Google 撤銷
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
