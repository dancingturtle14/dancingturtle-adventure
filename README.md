# 🌀 無限流模擬器

> AI 驅動文字冒險 RPG · DancingTurtle Studio

自用+朋友嘅文字冒險網站，AI 做 GM，每日有限次冒險，收集裝備打副本。

## 🌐 網站

**[https://dancingturtle14.github.io/dancingturtle-adventure](https://dancingturtle14.github.io/dancingturtle-adventure)**

## 🎮 功能

- **⚔️ 多選冒險** — A/B/C/D 四選一，無自由輸入，安全公平
- **🤖 AI GM** — 支援 OpenRouter，自動生成獨一無二嘅副本
- **🎒 物品系統** — 6 Tier 稀有度（普通→✦神級 0.01%）
- **⚡ 體力系統** — 每日 5 次免費 + 體力回復
- **💰 資金系統** — 物品可賣 NPC 商店換資金
- **🏆 排行榜** — 綜合評分自動計算
- **💬 大廳聊天** — 玩家交流

## 🏗️ Tech Stack

| 層 | 技術 |
|---|------|
| 前端 | HTML/CSS/JS (純靜態) |
| Hosting | GitHub Pages |
| 後端 | Supabase (Auth + PostgreSQL) |
| AI GM | OpenRouter API |

## 🚀 本地開發

```bash
cd /mnt/c/Hermes/dancingturtle-adventure
python3 -m http.server 8080
# → http://localhost:8080
```

## 📁 Project Structure

```
├── lobby.html          # 大廳 — 角色狀態 + 聊天
├── game.html           # 冒險 — A/B/C/D 多選
├── inventory.html      # 背包 — 物品管理
├── shop.html           # 商店 — NPC 收購
├── trade.html          # 交易 — P2P (待 Supabase)
├── ranking.html        # 排行榜
├── css/
│   ├── style.css       # 基礎樣式
│   └── game-components.css  # 遊戲組件
└── js/
    ├── data.js         # 物品/稀有度/副本定義
    ├── game.js         # 核心引擎
    ├── ai-gm.js        # OpenRouter 整合
    └── ui-*.js         # 各頁面 UI 控制器
```
