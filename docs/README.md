# 共建河口食物網

## 開啟

直接雙擊主資料夾的 index.html 即可使用，不需安裝軟體或啟動本機服務。index.html 必須與 docs 資料夾一起保留。

## 修改介紹

原始資料是 docs/species/河口食物網_26項圖卡詳細介紹.md。

GitHub Pages：修改並上傳此 Markdown，重新整理網頁即可讀取最新內容。

雙擊本機首頁：瀏覽器不允許直接讀取任意本機 Markdown，所以網站使用從原檔產生的 offline-data.js。修改 Markdown 後，雙擊 docs/local/更新離線資料.cmd（需 Node.js）再重新開啟網頁。

名稱依 `## 01｜水中的氣體陽光和養分` 這類標題取得，每項只對應 docs/species/名稱.png。目前為新版24項圖卡；左右框架共用同一張已載入圖片，依框架大小縮放顯示。介紹不是人工重複維護在程式裡，離線副本由 Markdown 自動產生。

## GitHub Pages

上傳 index.html、docs/web、docs/species 即包含完整網站。所有資源採相對路徑，無後端依賴。發布來源選擇首頁所在分支的 /(root)。docs/local 僅為可選維護工具；docs/source-files 為保留的原始文件，不必上傳。

## 維護程式

docs/web/data.js、model.js、app.js 是原始程式；網頁實際載入 app.bundle.js。修改程式或 Markdown 後，執行 docs/local/更新離線資料.cmd 自動更新網站程式與離線副本。

本機 HTTP 服務仍可選用 docs/local/啟動網頁.cmd，方便開發時直接讀取 Markdown，但一般使用不需要它。

