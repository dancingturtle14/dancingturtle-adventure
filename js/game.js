/* ============================================
   無限流模擬器 — 核心遊戲引擎
   AI 預生成副本 · 分支導航 · 世界歷史
   ============================================ */

// ======== 世界定義（副本概念，唔再包含具體場景）=======
const WORLDS = [
  {
    id: 'sleeping_village',
    name: '沉睡村莊', tier: 'F', type: '探索',
    minLevel: 1,
    tags: ['village', 'sleep', 'curse'],
    description: '一個被奇怪睡意籠罩的偏遠村莊。村民們陷入無法醒來的沉睡...',
    teHint: '發現並解除村莊下的遠古封印',
    heHint: '喚醒足夠多的村民',
    beHint: '被睡意吞噬',
    color: '#b2bec3',
  },
  {
    id: 'mist_forest', name: '迷霧森林', tier: 'E', type: '解謎',
    minLevel: 3, tags: ['forest', 'mist', 'ruins'],
    description: '一片終年被魔法濃霧籠罩的森林。據說森林深處隱藏著古老遺跡...',
    teHint: '喚醒森林守護者，獲得傳承',
    heHint: '找到出路逃離森林',
    beHint: '在迷霧中迷失',
    color: '#55efc4',
  },
  {
    id: 'forgotten_library', name: '遺忘圖書館', tier: 'D', type: '解謎',
    minLevel: 5, tags: ['library', 'knowledge', 'void'],
    description: '一座不在任何地圖上的古老圖書館。書架上的書籍以未知語言書寫...',
    teHint: '閱讀禁書區的創世記錄',
    heHint: '找到圖書館的出口',
    beHint: '被書中知識吞噬意識',
    color: '#74b9ff',
  },
  {
    id: 'blood_moon_theater', name: '血月劇院', tier: 'C', type: '規則怪談',
    minLevel: 8, tags: ['theater', 'rules', 'performance'],
    description: '一座只在血月之夜出現的維多利亞風格劇院。你被分配到一個角色...',
    teHint: '揭穿劇院本身就是活着的生命體',
    heHint: '完成整場演出而不違反規則',
    beHint: '違反劇院規則',
    color: '#fdcb6e',
  },
  {
    id: 'void_gate', name: '虛空之門', tier: 'B', type: '戰鬥',
    minLevel: 12, tags: ['void', 'gate', 'cosmic'],
    description: '一道通往虛空的裂縫出現在現實世界中。你被選中進入其中...',
    teHint: '封印虛空裂縫，理解虛空的真相',
    heHint: '擊退虛空生物，關閉裂縫',
    beHint: '被虛空吞噬',
    color: '#e17055',
  },
  {
    id: 'abyss_ruins', name: '深淵遺跡', tier: 'A', type: '混合',
    minLevel: 18, tags: ['abyss', 'ruins', 'ancient'],
    description: '遠古文明在深淵中建造的最後堡壘。這裡埋藏著無限流世界最深的秘密...',
    teHint: '解開深淵文明的終極謎題',
    heHint: '從深淵中帶回關鍵的古代遺物',
    beHint: '成為深淵的一部分',
    color: '#ff6b6b',
  },
];

// ======== 世界歷史追蹤 ========
const WorldHistory = {
  STORAGE_KEY: 'wuxianliu_history',

  _load() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
    } catch { return {}; }
  },

  _save(data) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  },

  getRecord(worldId) {
    const all = this._load();
    return all[worldId] || { entries: [], totalRuns: 0, bestEnding: null };
  },

  addRun(worldId, runRecord) {
    const all = this._load();
    if (!all[worldId]) {
      all[worldId] = { entries: [], totalRuns: 0, bestEnding: null };
    }
    all[worldId].entries.unshift({
      ...runRecord,
      date: new Date().toISOString(),
    });
    all[worldId].totalRuns++;

    // Track best ending
    const endingRank = { TE: 3, HE: 2, BE: 1 };
    if (!all[worldId].bestEnding || endingRank[runRecord.ending] > endingRank[all[worldId].bestEnding]) {
      all[worldId].bestEnding = runRecord.ending;
    }

    // Keep last 50 entries per world
    if (all[worldId].entries.length > 50) {
      all[worldId].entries = all[worldId].entries.slice(0, 50);
    }

    this._save(all);
  },

  getSummary(worldId) {
    const record = this.getRecord(worldId);
    return {
      totalRuns: record.totalRuns,
      bestEnding: record.bestEnding,
      recentEntries: record.entries.slice(0, 5),
    };
  },

  getAll() {
    return this._load();
  },

  syncToSupabase(playerId) {
    if (!SUPABASE || !playerId) return;
    const all = this._load();
    for (const [worldId, data] of Object.entries(all)) {
      if (data.totalRuns > 0) {
        SUPABASE.from('world_history').upsert({
          player_id: playerId,
          world_id: worldId,
          entry_count: data.totalRuns,
          best_ending: data.bestEnding,
          last_entered_at: data.entries[0]?.date || new Date().toISOString(),
        }, { onConflict: 'player_id,world_id' });
      }
    }
  }
};

// ======== 儲存管理 ========
const Storage = {
  KEY: 'wuxianliu_save',
  DUNGEON_KEY: 'wuxianliu_dungeon',

  save(player) {
    try { localStorage.setItem(this.KEY, JSON.stringify(player)); } catch {}
  },

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  saveDungeon(dungeon) {
    try { localStorage.setItem(this.DUNGEON_KEY, JSON.stringify(dungeon)); } catch {}
  },

  loadDungeon() {
    try {
      const raw = localStorage.getItem(this.DUNGEON_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  clearDungeon() {
    localStorage.removeItem(this.DUNGEON_KEY);
  },

  getGuestPlayer() { return createDefaultPlayer('夜鴞', '🦉'); },
  clear() { localStorage.removeItem(this.KEY); }
};

// ======== 體力系統 ========
const StaminaSystem = {
  getAvailable(player) {
    const elapsed = (Date.now() - player.lastRecharge) / 1000;
    const recharged = Math.min(player.maxStamina - player.stamina, Math.floor(elapsed / RECHARGE_SECONDS));
    return player.stamina + recharged;
  },
  canRun(player) { return this.getAvailable(player) >= STAMINA_PER_RUN || player.dailyRunsLeft > 0; },
  spend(player) {
    if (player.dailyRunsLeft > 0) { player.dailyRunsLeft--; return true; }
    const available = this.getAvailable(player);
    if (available < STAMINA_PER_RUN) return false;
    player.stamina = available - STAMINA_PER_RUN;
    player.lastRecharge = Date.now();
    return true;
  },
  checkDailyReset(player) {
    const today = new Date().toISOString().split('T')[0];
    if (player.lastDailyReset !== today) {
      player.dailyRunsLeft = FREE_RUNS_PER_DAY;
      player.lastDailyReset = today;
      return true;
    }
    return false;
  }
};

// ======== d20 Stat Check ========
function skillCheck(statName, playerStats, dc) {
  const bonus = playerStats[statName] || 0;
  const roll = Math.floor(Math.random() * 20) + 1;
  const total = roll + bonus;
  return { success: total >= dc, roll, bonus, total, dc, margin: total - dc, natural20: roll === 20, natural1: roll === 1, statName };
}

// ======== AI 副本生成器 ========
const DungeonGen = {
  _seedCounter: 0,

  // AI 生成完整副本樹
  async generate(world, player) {
    this._seedCounter++;

    // 如果有 AI key，用 AI 生成
    if (AIGM && AIGM.apiKey) {
      try {
        const result = await AIGM.generateDungeonTree(world, player, this._seedCounter);
        if (result) {
          Storage.saveDungeon(result);
          return result;
        }
      } catch(e) {
        console.warn('AI dungeon generation failed, using template:', e.message);
      }
    }

    // Fallback：用示範副本
    return this._templateFallback(world, player);
  },

  // 示範副本（無 AI 時用）
  _templateFallback(world, player) {
    const dungeon = {
      instanceId: `demo_${Date.now()}`,
      worldId: world.id,
      worldName: world.name,
      worldTier: world.tier,
      seed: this._seedCounter,
      background: world.description,
      playerStatsAtEntry: { ...player.stats },
      playerLevel: player.level,
      branches: {},
      endings: [],
      currentBranch: 'start',
      pathTaken: [],
      completed: false,
      finalEnding: null,
      generatedAt: new Date().toISOString(),
    };

    // 每個世界有 3 條主路線 + 隱藏路線
    const branchDefs = BRANCH_TEMPLATES[world.id];
    if (branchDefs) {
      dungeon.branches = this._deepClone(branchDefs);
      dungeon.endings = BRANCH_ENDINGS[world.id] || [];
    } else {
      // Generic fallback
      dungeon.branches = this._genericBranches();
      dungeon.endings = this._genericEndings();
    }

    // Adapt DCs to player level
    this._adaptDCs(dungeon, player);

    Storage.saveDungeon(dungeon);
    return dungeon;
  },

  _adaptDCs(dungeon, player) {
    for (const branch of Object.values(dungeon.branches)) {
      if (branch.choices) {
        for (const choice of branch.choices) {
          if (choice.requires?.dc) {
            // Scale DC to be challenging but achievable
            const statValue = player.stats[choice.requires.stat] || 5;
            choice.requires.dc = Math.max(5, Math.min(20, statValue + Math.floor(Math.random() * 6) + 2));
          }
        }
      }
    }
  },

  _deepClone(obj) { return JSON.parse(JSON.stringify(obj)); },

  _genericBranches() {
    return {
      'start': {
        id: 'start', title: '入口', description: '你踏入了未知的領域。四周充滿了詭異的寂靜。',
        choices: [
          { id: 'c1', text: '仔細觀察四周', requires: { stat: 'insight', dc: 8 }, leadsTo: 'b_explore',
            encounter: { type: 'exploration', difficulty: 'easy', winRate: 0.7, xpReward: 20, itemPool: ['herb'], itemDropChance: 0.3 } },
          { id: 'c2', text: '勇敢向前走', requires: null, leadsTo: 'b_story',
            encounter: { type: 'story', difficulty: 'none', winRate: 1.0, xpReward: 15, itemPool: [], itemDropChance: 0 } },
          { id: 'c3', text: '尋找隱藏路徑 [解謎 10]', requires: { stat: 'puzzle', dc: 10 }, leadsTo: 'b_puzzle',
            encounter: { type: 'puzzle', difficulty: 'medium', winRate: 0.6, xpReward: 25, itemPool: ['old_key'], itemDropChance: 0.35 } },
          { id: 'c4', text: '跟隨直覺走 [運氣 6]', requires: { stat: 'luck', dc: 6 }, leadsTo: 'b_luck',
            encounter: { type: 'gambling', difficulty: 'variable', winRate: 0.5, xpReward: 30, itemPool: ['bone_charm'], itemDropChance: 0.4 } },
        ]
      },
      'b_explore': { id: 'b_explore', title: '探索之路', description: '你發現了一些有趣的線索...',
        choices: [{ id: 'c5', text: '繼續深入', requires: null, leadsTo: 'end_he',
          encounter: { type: 'exploration', difficulty: 'medium', winRate: 0.8, xpReward: 25, itemPool: ['moon_pendant'], itemDropChance: 0.3 } }] },
      'b_story': { id: 'b_story', title: '命運之路', description: '你遇到了一個神秘的人物...',
        choices: [{ id: 'c6', text: '與他對話', requires: null, leadsTo: 'end_he',
          encounter: { type: 'story', difficulty: 'none', winRate: 1.0, xpReward: 20, itemPool: ['cloth_armor'], itemDropChance: 0.25 } }] },
      'b_puzzle': { id: 'b_puzzle', title: '解謎之路', description: '一個古老的機關擋住了你的去路。',
        choices: [{ id: 'c7', text: '嘗試破解機關', requires: null, leadsTo: 'end_te',
          encounter: { type: 'puzzle', difficulty: 'hard', winRate: 0.5, xpReward: 35, itemPool: ['enigma_ring'], itemDropChance: 0.4 } }] },
      'b_luck': { id: 'b_luck', title: '機緣之路', description: '你誤打誤撞來到了一個隱藏區域...',
        choices: [{ id: 'c8', text: '探索這個區域', requires: null, leadsTo: 'end_he',
          encounter: { type: 'gambling', difficulty: 'easy', winRate: 0.6, xpReward: 22, itemPool: ['bone_charm'], itemDropChance: 0.3 } }] },
      'end_be': { id: 'end_be', title: '💀 終點', description: '你被周圍的黑暗吞噬...', choices: [], isEnd: true },
      'end_he': { id: 'end_he', title: '出口', description: '你看到了出口的光亮！', choices: [], isEnd: true },
      'end_te': { id: 'end_te', title: '✦ 真相', description: '你發現了這個世界的核心秘密！', choices: [], isEnd: true },
    };
  },

  _genericEndings() {
    return [
      { type: 'TE', label: '✦ True End', condition: '發現核心秘密', pathPattern: 'start→b_puzzle→end_te', xpBonus: 300 },
      { type: 'HE', label: '✅ Normal End', condition: '找到出口', pathPattern: 'start→*→end_he', xpBonus: 150 },
      { type: 'BE', label: '💀 Bad End', condition: '被吞噬', pathPattern: 'start→*→end_be', xpBonus: 30 },
    ];
  }
};

// ======== 示範分支模板 ========
const BRANCH_TEMPLATES = {
  'sleeping_village': {
    'start': {
      id: 'start', title: '村莊入口', description: '你走進沉睡村莊。街道上散落著停擺的雜物——翻倒的攤車、未收的衣服、半杯涼透的茶。所有村民都沉睡著。村中央的水井散發著淡淡的藍綠色光芒。',
      choices: [
        { id: 'c1', text: '檢查水井中的發光來源 [洞察 8]', requires: { stat: 'insight', dc: 8 }, leadsTo: 'b_explore',
          encounter: { type: 'exploration', difficulty: 'easy', winRate: 0.75, xpReward: 20, itemPool: ['moon_pendant', 'herb'], itemDropChance: 0.3 } },
        { id: 'c2', text: '嘗試喚醒一個村民', requires: null, leadsTo: 'b_awaken',
          encounter: { type: 'story', difficulty: 'none', winRate: 1.0, xpReward: 15, itemPool: ['cloth_armor'], itemDropChance: 0.2 } },
        { id: 'c3', text: '搜索村長的屋子 [解謎 10]', requires: { stat: 'puzzle', dc: 10 }, leadsTo: 'b_clue',
          encounter: { type: 'puzzle', difficulty: 'medium', winRate: 0.6, xpReward: 25, itemPool: ['old_key', 'ancient_compass'], itemDropChance: 0.35 } },
        { id: 'c4', text: '喝一口發光的井水 [運氣 6]', requires: { stat: 'luck', dc: 6 }, leadsTo: 'b_vision',
          encounter: { type: 'gambling', difficulty: 'variable', winRate: 0.5, xpReward: 30, itemPool: ['bone_charm'], itemDropChance: 0.4 } },
      ]
    },
    'b_explore': {
      id: 'b_explore', title: '井底之謎', description: '你俯身看向水井深處。藍綠色光芒來自井底的一個古老封印——三個螺旋組成的圖案正緩慢轉動。封印上刻著一行小字：「萬物歸一」。',
      choices: [
        { id: 'c5', text: '試圖解除封印 [解謎 12]', requires: { stat: 'puzzle', dc: 12 }, leadsTo: 'end_te',
          encounter: { type: 'puzzle', difficulty: 'hard', winRate: 0.5, xpReward: 35, itemPool: ['star_fragment'], itemDropChance: 0.35 } },
        { id: 'c6', text: '尋找更多關於封印的信息', requires: null, leadsTo: 'end_he',
          encounter: { type: 'exploration', difficulty: 'medium', winRate: 0.7, xpReward: 22, itemPool: ['ancient_compass'], itemDropChance: 0.3 } },
      ]
    },
    'b_awaken': {
      id: 'b_awaken', title: '甦醒嘗試', description: '你搖晃一個村民的肩膀。他的眼皮顫動了一下，但沒有醒來。你注意到所有村民的手背上都刻著相同的螺旋符號。',
      choices: [
        { id: 'c7', text: '清除村民手上的符號', requires: null, leadsTo: 'end_he',
          encounter: { type: 'story', difficulty: 'none', winRate: 1.0, xpReward: 18, itemPool: ['herb', 'cloth_armor'], itemDropChance: 0.2 } },
        { id: 'c8', text: '研究符號的意義 [洞察 10]', requires: { stat: 'insight', dc: 10 }, leadsTo: 'b_explore',
          encounter: { type: 'exploration', difficulty: 'easy', winRate: 0.75, xpReward: 20, itemPool: ['old_key'], itemDropChance: 0.25 } },
      ]
    },
    'b_clue': {
      id: 'b_clue', title: '村長書房', description: '村長的書桌上有一本翻開的日記。最後一頁寫著：「封印在井底，解法在星光中。農曆十五月圓之夜，三個螺旋重合之時，封印最弱。」',
      choices: [
        { id: 'c9', text: '帶上日記去水井', requires: null, leadsTo: 'end_te',
          encounter: { type: 'story', difficulty: 'none', winRate: 1.0, xpReward: 25, itemPool: ['star_fragment'], itemDropChance: 0.3 } },
        { id: 'c10', text: '搜索書房暗格 [解謎 8]', requires: { stat: 'puzzle', dc: 8 }, leadsTo: 'end_he',
          encounter: { type: 'puzzle', difficulty: 'easy', winRate: 0.8, xpReward: 20, itemPool: ['silver_dagger'], itemDropChance: 0.3 } },
      ]
    },
    'b_vision': {
      id: 'b_vision', title: '幻象', description: '井水的力量讓你看到了幻象——村莊地下深處有一座遠古祭壇，祭壇上放著一個打開的盒子。盒子中空無一物，但周圍環繞著強大的能量。',
      choices: [
        { id: 'c11', text: '跟隨幻象中的路去找祭壇', requires: null, leadsTo: 'end_te',
          encounter: { type: 'gambling', difficulty: 'hard', winRate: 0.5, xpReward: 35, itemPool: ['void_blade'], itemDropChance: 0.3 } },
        { id: 'c12', text: '幻象太危險，回到現實', requires: null, leadsTo: 'end_he',
          encounter: { type: 'gambling', difficulty: 'easy', winRate: 0.8, xpReward: 18, itemPool: ['luck_charm'], itemDropChance: 0.2 } },
      ]
    },
    'end_be': { id: 'end_be', title: '💀 吞噬', description: '睡意如潮水般湧來。你無法抵抗...陷入永恆的沉睡。', choices: [], isEnd: true },
    'end_he': { id: 'end_he', title: '✅ 曙光', description: '你成功喚醒了村民們！雖然封印仍在，但村莊恢復了生機。', choices: [], isEnd: true },
    'end_te': { id: 'end_te', title: '✦ 解放', description: '你解除了井底的遠古封印！村庄真正自由了——而你也獲得了一份特殊的力量。', choices: [], isEnd: true },
  },
  'forgotten_library': {
    'start': {
      id: 'start', title: '圖書館大廳', description: '書架延伸到視線盡頭，高得看不見天花板。空中飄浮著發光的文字，地板上刻著：「知識即為鑰匙」。',
      choices: [
        { id: 'c1', text: '觀察發光的文字 [洞察 8]', requires: { stat: 'insight', dc: 8 }, leadsTo: 'b_explore',
          encounter: { type: 'exploration', difficulty: 'easy', winRate: 0.7, xpReward: 20, itemPool: ['moon_pendant'], itemDropChance: 0.3 } },
        { id: 'c2', text: '沿書架之間探索', requires: null, leadsTo: 'b_story',
          encounter: { type: 'story', difficulty: 'none', winRate: 1.0, xpReward: 15, itemPool: ['herb'], itemDropChance: 0.2 } },
        { id: 'c3', text: '解讀地板文字 [解謎 10]', requires: { stat: 'puzzle', dc: 10 }, leadsTo: 'b_puzzle',
          encounter: { type: 'puzzle', difficulty: 'medium', winRate: 0.6, xpReward: 25, itemPool: ['enigma_ring'], itemDropChance: 0.35 } },
        { id: 'c4', text: '隨手翻開一本書 [運氣 6]', requires: { stat: 'luck', dc: 6 }, leadsTo: 'b_luck',
          encounter: { type: 'gambling', difficulty: 'variable', winRate: 0.5, xpReward: 30, itemPool: ['bone_charm'], itemDropChance: 0.4 } },
      ]
    },
    'b_explore': { id: 'b_explore', title: '發光文字', description: '那些文字組成了一份古老的地圖。你看到圖書館的結構——中央大廳地下還有一層。', choices: [
      { id: 'c5', text: '前往地下層', requires: null, leadsTo: 'end_te',
        encounter: { type: 'exploration', difficulty: 'hard', winRate: 0.55, xpReward: 40, itemPool: ['time_hourglass', 'book_of_fate'], itemDropChance: 0.35 } },
      { id: 'c6', text: '繼續在地面探索', requires: null, leadsTo: 'end_he',
        encounter: { type: 'exploration', difficulty: 'medium', winRate: 0.7, xpReward: 20, itemPool: ['silver_dagger'], itemDropChance: 0.3 } },
    ]},
    'b_story': { id: 'b_story', title: '書架之間', description: '你在一個書架上發現了一本空白的書——但當你觸碰它時，文字開始浮現。', choices: [
      { id: 'c7', text: '閱讀浮現的文字', requires: null, leadsTo: 'end_te',
        encounter: { type: 'story', difficulty: 'none', winRate: 1.0, xpReward: 25, itemPool: ['book_of_fate'], itemDropChance: 0.25 } },
    ]},
    'b_puzzle': { id: 'b_puzzle', title: '文字謎題', description: '地板上的文字是一個謎題。七根蠟燭燃燒著，但只有六個燭台。', choices: [
      { id: 'c8', text: '排列蠟燭順序', requires: null, leadsTo: 'end_te',
        encounter: { type: 'puzzle', difficulty: 'hard', winRate: 0.5, xpReward: 35, itemPool: ['time_hourglass'], itemDropChance: 0.35 } },
    ]},
    'b_luck': { id: 'b_luck', title: '隨機之書', description: '你翻開的書頁中掉出一張書籤——上面寫著通往禁書區的密碼。', choices: [
      { id: 'c9', text: '用密碼去禁書區', requires: null, leadsTo: 'end_te',
        encounter: { type: 'gambling', difficulty: 'medium', winRate: 0.6, xpReward: 35, itemPool: ['star_fragment'], itemDropChance: 0.3 } },
    ]},
    'end_be': { id: 'end_be', title: '💀 迷失', description: '圖書館的知識洪流淹沒了你的意識。你迷失在無盡的書架中。', choices: [], isEnd: true },
    'end_he': { id: 'end_he', title: '✅ 離開', description: '你找到了圖書館的出口。雖然未能探索所有秘密，但帶回了一些珍貴的知識。', choices: [], isEnd: true },
    'end_te': { id: 'end_te', title: '✦ 真相', description: '你閱讀了禁書區的創世記錄。世界的真相遠比你想像的更加宏大...你獲得了命運之書的認可。', choices: [], isEnd: true },
  },
};

// ======== 結局模板 ========
const BRANCH_ENDINGS = {
  'sleeping_village': [
    { type: 'TE', label: '✦ True End', condition: '解除封印', pathPattern: 'start→(b_explore|b_vision|b_clue)→end_te', xpBonus: 300 },
    { type: 'HE', label: '✅ Normal End', condition: '喚醒村民', pathPattern: 'start→*→end_he', xpBonus: 150 },
    { type: 'BE', label: '💀 Bad End', condition: '被睡意吞噬', pathPattern: 'start→*→end_be', xpBonus: 30 },
  ],
  'forgotten_library': [
    { type: 'TE', label: '✦ True End', condition: '閱讀創世記錄', pathPattern: 'start→(b_explore|b_puzzle|b_luck|b_story)→end_te', xpBonus: 300 },
    { type: 'HE', label: '✅ Normal End', condition: '找到出口', pathPattern: 'start→*→end_he', xpBonus: 150 },
    { type: 'BE', label: '💀 Bad End', condition: '迷失知識洪流', pathPattern: 'start→*→end_be', xpBonus: 30 },
  ],
};

// ======== 遊戲狀態 ========
const Game = {
  player: null,
  currentDungeon: null,  // AI-generated dungeon tree
  currentBranch: null,   // current branch node
  isProcessing: false,

  init() {
    this.loadPlayer();
    StaminaSystem.checkDailyReset(this.player);
    this.save();
  },

  loadPlayer() { this.player = Storage.load() || Storage.getGuestPlayer(); },
  save() { Storage.save(this.player); },

  // 檢查世界歷史
  getWorldHistory(worldId) {
    return WorldHistory.getSummary(worldId);
  },

  getAllWorldHistory() {
    return WorldHistory.getAll();
  },

  // 開始冒險：AI 預生成完整副本
  async startRun(worldId) {
    if (this.isProcessing) return null;
    this.isProcessing = true;

    const world = WORLDS.find(w => w.id === worldId);
    if (!world) { this.isProcessing = false; return null; }

    if (!StaminaSystem.canRun(this.player)) { this.isProcessing = false; return null; }

    // 扣體力
    StaminaSystem.spend(this.player);
    this.save();

    // AI 生成副本樹
    const dungeon = await DungeonGen.generate(world, this.player);
    this.currentDungeon = dungeon;
    this.currentBranch = dungeon.branches['start'];

    this.isProcessing = false;
    return dungeon;
  },

  // 獲取當前分支
  getCurrentBranch() {
    return this.currentBranch;
  },

  // 選擇一個選項
  makeChoice(choiceId) {
    if (!this.currentDungeon || !this.currentBranch) return null;

    const choice = this.currentBranch.choices?.find(c => c.id === choiceId);
    if (!choice) return null;

    // 檢查 stat 需求
    if (choice.requires) {
      const check = skillCheck(choice.requires.stat, this.player.stats, choice.requires.dc);
      if (!check.success) {
        // Failed check — still proceed but with disadvantage
        return this._resolveChoice(choice, false);
      }
    }

    return this._resolveChoice(choice, true);
  },

  _resolveChoice(choice, statPassed) {
    const enc = choice.encounter;
    const result = this._rollEncounter(enc, statPassed);

    // 記錄路徑
    this.currentDungeon.pathTaken.push(choice.id);
    this.currentDungeon.currentBranch = choice.leadsTo;

    // 獲取下一個分支
    const nextBranch = this.currentDungeon.branches[choice.leadsTo];
    const isEnd = nextBranch?.isEnd || false;

    // Apply rewards
    if (result.success) {
      this.player.exp += result.xpGained;
      const newLevel = calcLevel(this.player.exp);
      if (newLevel > this.player.level) this.player.level = newLevel;

      // 物品掉落
      if (result.item) {
        this.player.items.push(result.item);
      }
    }

    let ending = null;
    if (isEnd) {
      ending = this._determineEnding(choice.leadsTo);
      if (ending) {
        this.currentDungeon.finalEnding = ending.type;
        this.player.exp += ending.xpBonus;
        const newLevel = calcLevel(this.player.exp);
        if (newLevel > this.player.level) this.player.level = newLevel;

        if (ending.type === 'TE') this.player.teCount++;
        else if (ending.type === 'HE') this.player.heCount++;
        else this.player.beCount++;
        this.player.completedRuns++;

        // 世界歷史記錄
        WorldHistory.addRun(this.currentDungeon.worldId, {
          ending: ending.type,
          xpGained: result.xpGained + (ending.xpBonus || 0),
          items: result.item ? [result.item.name] : [],
          path: [...this.currentDungeon.pathTaken],
        });

        // Sync to Supabase if connected
        if (typeof SupaDB !== 'undefined' && SupaDB.ready()) {
          this._syncRunToSupabase(ending, result);
        }
      }
    }

    this.currentBranch = nextBranch;
    if (isEnd) {
      this.currentDungeon.completed = true;
      Storage.clearDungeon();
    } else {
      Storage.saveDungeon(this.currentDungeon);
    }
    this.save();

    return { result, nextBranch, isEnd, ending, choice, statPassed };
  },

  _rollEncounter(enc, statPassed) {
    const roll = Math.random();
    const winRate = statPassed ? enc.winRate : enc.winRate * 0.5;
    const success = roll < winRate || enc.difficulty === 'none';

    const xpGained = success ? enc.xpReward : Math.floor(enc.xpReward * 0.3);

    // Roll for item drop
    let item = null;
    if (success && enc.itemPool?.length > 0 && Math.random() < enc.itemDropChance) {
      const templateId = enc.itemPool[Math.floor(Math.random() * enc.itemPool.length)];
      const template = ITEM_TEMPLATES[templateId];
      if (template) {
        item = createItemInstance(templateId);
        if (item && SUPABASE) {
          SupaDB.saveItem(item);
        }
      }
    }

    return { success, xpGained, item, roll, winRate };
  },

  _determineEnding(branchId) {
    const endings = this.currentDungeon.endings;
    // Match from highest priority
    const te = endings.find(e => e.pathPattern.includes(branchId) && e.type === 'TE');
    if (te && this.currentDungeon.pathTaken.some(p => te.pathPattern.includes(p))) return te;
    const he = endings.find(e => e.pathPattern.includes(branchId) && e.type === 'HE');
    if (he) return he;
    const be = endings.find(e => e.pathPattern.includes(branchId) && e.type === 'BE');
    return be || endings[endings.length - 1];
  },

  _syncRunToSupabase(ending, result) {
    if (!SUPABASE || !this.player?.id) return;
    SUPABASE.from('runs').insert({
      player_id: this.player.id,
      dungeon_world_id: this.currentDungeon.worldId,
      ending_type: ending.type,
      xp_gained: result.xpGained + (ending.xpBonus || 0),
      items_gained: result.item ? [result.item.templateId] : [],
      path_taken: this.currentDungeon.pathTaken,
      completed_at: new Date().toISOString(),
    }).then(() => {
      WorldHistory.syncToSupabase(this.player.id);
    }).catch(() => {});
  },

  // 繼續未完成的冒險
  resumeRun() {
    const dungeon = Storage.loadDungeon();
    if (dungeon && !dungeon.completed) {
      this.currentDungeon = dungeon;
      this.currentBranch = dungeon.branches[dungeon.currentBranch];
      return dungeon;
    }
    return null;
  },

  getStaminaDisplay() {
    const available = StaminaSystem.getAvailable(this.player);
    return { current: available, max: this.player.maxStamina, dailyLeft: this.player.dailyRunsLeft, canRun: StaminaSystem.canRun(this.player) };
  },

  getAvailableWorlds() {
    return WORLDS.filter(w => this.player.level >= w.minLevel);
  },

  sellItem(instanceId) {
    const idx = this.player.items.findIndex(i => i.instanceId === instanceId);
    if (idx === -1) return false;
    const item = this.player.items[idx];
    const price = Math.floor((item.sellPrice || 0) * (0.2 + Math.random() * 0.1));
    this.player.currency += price;
    this.player.items.splice(idx, 1);
    this.save();
    return { price, itemName: item.name };
  },
};
