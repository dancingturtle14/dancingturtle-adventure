-- ============================================
-- 無限流模擬器 — Supabase 資料庫 Schema
-- ============================================

-- 1. 玩家資料
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID REFERENCES auth.users(id) UNIQUE,
  username TEXT UNIQUE NOT NULL,
  avatar TEXT DEFAULT '🦉',
  title TEXT DEFAULT '初曙探索者',
  level INT DEFAULT 1,
  exp INT DEFAULT 0,
  currency INT DEFAULT 0,
  stamina_current INT DEFAULT 100,
  stamina_max INT DEFAULT 100,
  stamina_last_recharge TIMESTAMPTZ DEFAULT NOW(),
  daily_runs_used INT DEFAULT 0,
  last_daily_reset DATE DEFAULT CURRENT_DATE,
  stats JSONB DEFAULT '{"insight":5,"survival":5,"combat":5,"puzzle":5,"luck":5}',
  completed_runs INT DEFAULT 0,
  te_count INT DEFAULT 0,
  he_count INT DEFAULT 0,
  be_count INT DEFAULT 0,
  hidden_branches INT DEFAULT 0,
  achievements TEXT[] DEFAULT ARRAY['初生之犢'],
  divine_found BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 物品實例
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES players(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📦',
  rarity TEXT CHECK (rarity IN ('common','uncommon','rare','epic','legendary','divine')),
  slot TEXT DEFAULT 'misc',
  stats JSONB DEFAULT '{}',
  flavor TEXT DEFAULT '',
  obtain_from TEXT DEFAULT '',
  useful_in TEXT[] DEFAULT '{}',
  sell_price INT DEFAULT 0,
  acquired_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_items_owner ON items(owner_id);
CREATE INDEX idx_items_rarity ON items(rarity);

-- 3. 冒險記錄
CREATE TABLE runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  dungeon_instance_id UUID, -- references the pre-generated dungeon
  dungeon_world_id TEXT NOT NULL, -- e.g. 'sleeping_village'
  ending_type TEXT CHECK (ending_type IN ('TE','HE','BE','ABANDONED')),
  xp_gained INT DEFAULT 0,
  items_gained TEXT[] DEFAULT '{}', -- list of item IDs
  path_taken TEXT[] DEFAULT '{}', -- list of branch IDs chosen
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_runs_player ON runs(player_id);
CREATE INDEX idx_runs_world ON runs(dungeon_world_id);

-- 4. 世界歷史記錄（每個世界嘅累計數據）
CREATE TABLE world_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  world_id TEXT NOT NULL,
  entry_count INT DEFAULT 0,
  te_count INT DEFAULT 0,
  he_count INT DEFAULT 0,
  be_count INT DEFAULT 0,
  best_ending TEXT,
  last_entered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, world_id)
);

-- 5. AI 生成的副本實例（完整結構）
CREATE TABLE dungeon_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id TEXT NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  run_id UUID REFERENCES runs(id),
  seed INT NOT NULL,
  background TEXT NOT NULL,
  branches JSONB NOT NULL, -- 完整路線樹
  endings JSONB NOT NULL, -- 三種結局條件
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  completed BOOLEAN DEFAULT FALSE
);

-- 6. 聊天訊息
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar TEXT DEFAULT '🦉',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_created ON chat_messages(created_at DESC);

-- 7. 交易掛單
CREATE TABLE trade_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES players(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  price INT NOT NULL CHECK (price > 0),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','sold','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trade_active ON trade_listings(status) WHERE status = 'active';

-- 8. 全服廣播記錄（Divine 掉落時）
CREATE TABLE server_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  player_id UUID,
  item_name TEXT,
  rarity TEXT CHECK (rarity IN ('common','uncommon','rare','epic','legendary','divine')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE dungeon_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_broadcasts ENABLE ROW LEVEL SECURITY;

-- Players: read own, insert own, update own
CREATE POLICY "players_select_own" ON players FOR SELECT USING (auth_id = auth.uid());
CREATE POLICY "players_insert_own" ON players FOR INSERT WITH CHECK (auth_id = auth.uid());
CREATE POLICY "players_update_own" ON players FOR UPDATE USING (auth_id = auth.uid());

-- Items: read own, insert own, update own
CREATE POLICY "items_select_own" ON items FOR SELECT USING (owner_id IN (SELECT id FROM players WHERE auth_id = auth.uid()));
CREATE POLICY "items_insert_own" ON items FOR INSERT WITH CHECK (owner_id IN (SELECT id FROM players WHERE auth_id = auth.uid()));
CREATE POLICY "items_update_own" ON items FOR UPDATE USING (owner_id IN (SELECT id FROM players WHERE auth_id = auth.uid()));

-- Chat: everyone can read, authenticated can insert
CREATE POLICY "chat_select_all" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "chat_insert_auth" ON chat_messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Trade: everyone can read active listings, seller can manage own
CREATE POLICY "trade_select_active" ON trade_listings FOR SELECT USING (status = 'active' OR seller_id IN (SELECT id FROM players WHERE auth_id = auth.uid()));
CREATE POLICY "trade_insert_own" ON trade_listings FOR INSERT WITH CHECK (seller_id IN (SELECT id FROM players WHERE auth_id = auth.uid()));
CREATE POLICY "trade_update_own" ON trade_listings FOR UPDATE USING (seller_id IN (SELECT id FROM players WHERE auth_id = auth.uid()));

-- Broadcasts: everyone can read
CREATE POLICY "broadcasts_select_all" ON server_broadcasts FOR SELECT USING (true);

-- ============================================
-- Functions & Triggers
-- ============================================
-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Daily stamina reset function
CREATE OR REPLACE FUNCTION check_daily_reset()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_daily_reset IS NULL OR NEW.last_daily_reset < CURRENT_DATE THEN
    NEW.daily_runs_used := 0;
    NEW.last_daily_reset := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER players_daily_reset
  BEFORE INSERT OR UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION check_daily_reset();
