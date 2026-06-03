# 🎭 DancingTurtle 文字冒險 RPG — Proposal

> 個人娛樂 Project | 自用 + 朋友 | 無版權顧慮
> 靈感：網上江湖 + AI 文字冒險 + 二次元風格

---

## 📋 目錄

1. [Project 概念](#1-project-概念)
2. [核心功能](#2-核心功能)
3. [Tech Stack 建議](#3-tech-stack-建議)
4. [UI 設計概念](#4-ui-設計概念)
5. [開發階段](#5-開發階段)
6. [架構圖](#6-架構圖)
7. [下步行動](#7-下步行動)

---

## 1. Project 概念

一個 **AI 驅動嘅文字冒險 RPG 網站**，類似早年嘅網上江湖，但加入現代元素：

- **AI 做 GM**：你打字做乜，AI 即時生成故事情節同結果
- **共同世界背景**：所有玩家喺同一個世界入面活動（可以互動/組隊/PVP）
- **角色進度**：Level, HP, 裝備, 武功, 任務 — 全部記錄落資料庫
- **二次元風格**：角色頭像、場景插圖用 AI 生成 or 套圖
- **排行榜**：睇下邊個最勁

### 同網上江湖嘅分別

| 網上江湖 (2000s) | DancingTurtle Adventure |
|:----------------|:------------------------|
| 人手寫 scripted 事件 | **AI 即時生成** — 每個動作都獨一無二 |
| 固定地圖/任務 | **無限可能性** — AI 按世界觀即興創作 |
| 文字 only | **文字 + 二次元圖**（角色肖像、場景） |
| 同期 chat | **單人沉浸式冒險** + 排行榜社交 |
| 要自己 host server | **GitHub Pages + 免費 backend** |

---

## 2. 核心功能

### 🔐 用戶系統
- 註冊 / 登入（email + password）
- 個人檔案（頭像、簡介、等級）
- Session 管理

### 🧙 角色創造
- 名稱、性別、外貌描述
- 初始屬性分配（力量、靈活、內力、根骨、悟性）
- 背景故事（AI 幫你 generate 或手寫）
- 角色頭像（AI 生成 / 上傳）
- 最多可 create 3 個角色

### 🎮 文字冒險核心
- **AI GM** — 用 OpenRouter API（免費 model）做遊戲主持人
- 你打字做任何動作 → AI 描述 happening + 結果
- 狀態 tracking：HP, MP, 經驗值, 等級, 金錢
- 背包系統：執到嘅物品、裝備
- 武功/技能系統：學習、升級
- 任務/劇情：AI 按世界觀 generate 主線同支線

### 🏆 排行榜
- 等級榜
- 財富榜
- 武功榜
- 成就榜

### 🖼 二次元圖片支援
- **角色頭像** — 存在數據庫，玩家上傳或預設選擇
- **場景插圖** — AI 按當前場景 generate（Optional，可以逐個加）
- 用你部機嘅 ComfyUI 或者免費 API 生成

### 🌐 共同世界
- 所有角色存在同一個世界背景
- 公共頻道：可以見到其他玩家嘅「系統廣播」
- (Future) 組隊 / PVP / 交易

---

## 3. Tech Stack 建議

### 方案 A：全部免費 — Static Site + Supabase ✅ **推薦**

| Layer | 技術 | 費用 |
|:------|:-----|:----:|
| **Frontend** | HTML + CSS + Vanilla JS (or Vue.js) | Free |
| **Hosting** | GitHub Pages (`dancingturtle.github.io/adventure`) | Free |
| **Auth** | Supabase Auth (email/password) | Free tier |
| **Database** | Supabase PostgreSQL (500MB) | Free tier |
| **AI API** | OpenRouter Free Models (你已有 key) | Free |
| **圖片** | ComfyUI local / placeholder art first | Free |

**點解揀 Supabase：**
- Built-in auth（註冊/登入/密碼 reset）
- PostgreSQL database（角色資料、進度、排行榜）
- Row Level Security（你嘅 data 你嘅）
- Free tier 好大方（500MB DB, 5GB bandwidth, 50,000 monthly active users）
- 有 JavaScript client library，直接 frontend 叫就得

### 方案 B：Full Stack — Next.js + Vercel

| Layer | 技術 | 費用 |
|:------|:-----|:----:|
| **Frontend** | Next.js (React) | Free |
| **Hosting** | Vercel | Free tier |
| **Auth** | NextAuth.js | Free |
| **Database** | Supabase / PlanetScale | Free tier |
| **AI** | OpenRouter | Free |

### 推薦：**方案 A**
因為你要 host 喺 dancingturtle GitHub Pages，方案 A 最直接。
- 全部 static file 放 GitHub Pages
- Supabase 做 backend（auth + database）
- 直接 browser 叫 OpenRouter API（用 client-side key 或者通過 Supabase Edge Function）

---

## 4. UI 設計概念

### 整體風格
- **暗色主題**（深灰/黑色底） — 似 PaperChase 嘅 TradingView 風格
- **武俠/修真 UI 元素** — 毛筆字體、古風邊框、水墨 accent
- **二次元角色頭像** — 圓形 frame 顯示
- **Mobile responsive**

### 主要頁面

#### 1️⃣ 登入/註冊頁
- 全屏暗色背景 + 遊戲 logo（毛筆字形「江湖」）
- 簡潔嘅登入 form
- 註冊時可揀預設頭像

#### 2️⃣ 大廳 / 角色選擇
- 你所有角色嘅卡片顯示
- 每個卡片：頭像、名稱、等級、簡短 description
- 「開始冒險」、「創建新角色」按鈕

#### 3️⃣ 冒險主畫面（核心）
佈局參考網上江湖 + 現代 Chat UI：

```
┌──────────────────────────────────────┐
│  🗡️ DancingTurtle 江湖    👤 Lv.5   │  ← Header (角色狀態)
├──────────────────────────────────────┤
│ ┌──────────┐  ┌──────────────────┐  │
│ │ 👤頭像    │  │ [系統] 你進入咗   │  │
│ │ HP ████  │  │ 一個幽暗嘅森林…   │  │
│ │ MP ██    │  │                  │  │  ← 冒險日誌
│ │ EXP ███  │  │ 你：拔劍向前走    │  │  (scrollable chat-style)
│ │          │  │ [AI] 你嘅劍鋒…    │  │
│ │ 🎒背包   │  │ 突然草叢有動靜…  │  │
│ │ 📜武功   │  │                  │  │
│ └──────────┘  └──────────────────┘  │
├──────────────────────────────────────┤
│  [      輸入動作...           ] [>] │  ← Input bar
├──────────────────────────────────────┤
│  💬 公頻 | 🏆 排行 | 📊 狀態       │  ← Bottom nav
└──────────────────────────────────────┘
```

**設計要點：**
- 左邊係角色 panel（固定，scroll 時唔郁）
- 右邊係冒險日誌（似 chat log — 系統訊息灰色，AI 回應黑色/彩色，玩家動作藍色）
- 打字 input bar 置底
- 底部 navigation 切換到排行榜等功能

#### 4️⃣ 排行榜頁
- 分類 tab：等級 / 財富 / 武功 / 成就
- Table 風格：排名、頭像、名稱、等級、數值
- 自己嘅 row highlight

#### 5️⃣ 角色創建頁
- 名稱 input
- 屬性分配（可選 preset 或手動）
- 背景故事輸入（optional）
- 頭像選擇（預設二次元頭像庫）
- 「由 AI 生成背景故事」按鈕

---

## 5. 開發階段

### Phase 1 — MVP（基礎功能）
- [ ] GitHub repo setup + GitHub Pages 啟用
- [ ] 登入/註冊系統（Supabase Auth）
- [ ] 角色創建 + 資料庫 schema
- [ ] 冒險主畫面 UI（左 panel + 右 chat log）
- [ ] AI GM 基本 integration（OpenRouter → streaming response）
- [ ] 基本文字冒險 loop（你打字 → AI respond）
- [ ] 基本排行榜

### Phase 2 — RPG 系統
- [ ] 角色屬性系統（HP, MP, EXP, Level）
- [ ] 背包 / 裝備系統
- [ ] 武功 / 技能系統
- [ ] 戰鬥系統（AI generate 戰鬥描述 + 自動數值計算）
- [ ] 任務 / 劇情系統

### Phase 3 — 社交 & 圖片
- [ ] 二次元頭像支援（ComfyUI 生成）
- [ ] 場景插圖（generated per scene）
- [ ] 公共頻道（其他玩家廣播）
- [ ] 組隊功能
- [ ] PVP 系統

---

## 6. 架構圖

```
┌─────────────────────────────────────────────────────┐
│                 GitHub Pages                         │
│  ┌───────────────────────────────────────────────┐  │
│  │  Frontend (HTML/CSS/JS)                       │  │
│  │  - 登入/註冊頁                                 │  │
│  │  - 角色選擇頁                                   │  │
│  │  - 冒險主畫面 (角色panel + chat log)            │  │
│  │  - 排行榜頁                                     │  │
│  │  - 角色創建頁                                   │  │
│  └──────────┬────────────────────────────────────┘  │
└─────────────┼────────────────────────────────────────┘
              │
    ┌─────────┴─────────┬──────────────────┐
    │                   │                  │
    ▼                   ▼                  ▼
┌──────────┐   ┌──────────────┐   ┌──────────────┐
│ Supabase │   │  OpenRouter  │   │  ComfyUI     │
│ Auth     │   │  AI API      │   │  (Local)     │
│ DB       │   │  (Free LLM)  │   │  Image Gen   │
│ RLS      │   │              │   │              │
└──────────┘   └──────────────┘   └──────────────┘
```

**Data Flow：**
1. User 打字 → Frontend 送 action 去 Supabase Edge Function
2. Edge Function 拎角色 state + 世界 context → 組 prompt
3. Send 去 OpenRouter → receive streaming response
4. Parse response（文字 + 任何 state change）
5. Update database（HP, EXP, location 等）
6. Stream 文字返 Frontend display
7. (Optional) 同時 call ComfyUI generate 場景圖

---

## 7. 下步行動

等你確認咗呢個 proposal 之後：

1. **Setup GitHub**
   - 你要俾我 GitHub token / 直接 create repo
   - 啟用 GitHub Pages

2. **Setup Supabase**
   - 我幫你 create Supabase project（free tier）
   - Setup database schema（users, characters, inventory, etc.）
   - Setup auth

3. **Build MVP**
   - 我會由登入頁開始，逐頁 build
   - 每一步 send preview 俾你睇
   - 你俾 feedback 我先繼續

4. **你提供遊戲背景**
   - 世界觀名稱、設定（武俠/修真/現代/自定）
   - 任何 specific 規則或限制

---

**你覺得呢個方向點？有冇嘢想改先開始？**
