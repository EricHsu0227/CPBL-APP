# 中職數據 CPBL Stats

中華職棒數據網站（手機優先的 web app），姊妹作是 [MLB-APP](https://github.com/EricHsu0227/MLB-APP)。
數據來自 [野球革命 rebas.tw](https://www.rebas.tw) 的[開放資料](https://github.com/rebas-tw/rebas.tw-open-data)（ODC-By，需標註來源），
目前涵蓋 2023–2025 年例行賽、季後挑戰賽、台灣大賽，細到每一球（球種、球速、進壘點、擊球彈道、WE / WPA / RE24）。

頁面：首頁、賽程比分、單場（box score、逐打席含每球、勝率走勢）、戰績（全年 / 上下半季）、球隊、排行榜（對左 / 對右、規定打席、CSV）、球員（百分位、球種配球、生涯、逐場紀錄）。

```
npm install
npm run data     # python3 pipeline/build.py：下載開放資料 → public/data（約 10 秒，需要連到 github.com）
npm run dev
npm test         # JS；python3 pipeline/tests/test_stats.py 測資料計算
```

`public/data` 已經 commit 進 repo。GitHub Action「Build data」每週一自動找野球革命的新 release（例如 2026 年資料）並重建數據；也可以手動執行。

## 數據說明
- 打擊、投球數據由逐打席資料計算，打數 / 安打 / 全壘打 / 三振等已和官方 box score 核對。
- wOBA 權重以當季聯盟 RE24 推算並縮放到聯盟上壘率；wRC+ 沒有球場修正；FIP 常數取當季聯盟。
- 好球帶以野球革命進壘座標判斷（寬 ±50、高 ±60，約 0.5 公分為單位）。
- 擊球力道、落點等為野球革命人工紀錄。資料沒有勝投 / 敗投 / 救援紀錄。
- 規定打席 3.1 × 球隊場數，規定投球局數 1 × 球隊場數。

## 部署（Cloudflare Workers，靜態檔）
Cloudflare → Workers & Pages → Create → Import a repository → 選這個 repo。
Build command `npm run build`，deploy command `npx wrangler deploy`。開放資料授權允許公開，只要保留頁尾的來源標註。
