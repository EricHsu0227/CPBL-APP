# CPBL Stats — plan

## Stack（沿用 MLB-APP）
- 前端：Vite + React 18 + react-router（HashRouter，純靜態）。偏好設定存 localStorage。
- 數據：Python（只用標準函式庫）把野球革命開放資料的逐場 JSON 轉成 `public/data/` 靜態檔。GitHub Action 每週更新。
- 部署：Cloudflare Workers static assets。

## 資料
| 檔案 | 內容 |
|---|---|
| `index.json` | 球季、球隊名稱 |
| `<season>/games.json` | 所有比賽與比分 |
| `<season>/game/<kind>-<seq>.json` | box score + 逐打席（含每球球種、球速） |
| `<season>/standings.json` | 全年 / 上半季 / 下半季 |
| `<season>/bat.json`, `pit.json` | 例行賽球員數據（all / vsL / vsR） |
| `<season>/arsenal.json` | 投手球種配球 |
| `players/<id>.json` | 球員各季數據 + 逐場紀錄 |

## 限制
- 開放資料一季（或半季）發布一次，沒有即時比分。2026 年資料發布後 Action 會自動抓。
- rebas.tw 網站本身沒有公開 API；即時比分需要另找來源（例如中職官網），之後再評估。

## 下一步（想法）
- 球員比較、散佈圖（MLB-APP 的 Compare / Lab）
- 進壘點熱區圖、擊球落點圖
- 主題切換
