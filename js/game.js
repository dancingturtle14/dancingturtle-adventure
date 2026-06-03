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
// ======== 深層副本分支模板（每個世界 3-4 層選擇）=======
const BRANCH_TEMPLATES = {
  'sleeping_village': {
    'start': {
      id: 'start', title: '村莊入口', description: '你走進沉睡村莊。街道上散落著停擺的雜物——翻倒的攤車、未收的衣服、半杯涼透的茶。所有村民都沉睡著。村中央的水井散發著淡淡的藍綠色光芒，空氣中瀰漫著一股甜膩的花香。遠處傳來隱約的鼾聲節奏異常——像是某種規律的信號。',
      choices: [
        { id: 'c1', text: '檢查水井中的發光來源 [洞察 8]', requires: { stat: 'insight', dc: 8 }, leadsTo: 'l2_explore',
          encounter: { type: 'exploration', difficulty: 'easy', winRate: 0.75, xpReward: 20, itemPool: ['moon_pendant', 'herb'], itemDropChance: 0.3 } },
        { id: 'c2', text: '嘗試喚醒一個村民', requires: null, leadsTo: 'l2_awaken',
          encounter: { type: 'story', difficulty: 'none', winRate: 1.0, xpReward: 15, itemPool: ['cloth_armor'], itemDropChance: 0.2 } },
        { id: 'c3', text: '搜索村長的屋子 [解謎 10]', requires: { stat: 'puzzle', dc: 10 }, leadsTo: 'l2_clue',
          encounter: { type: 'puzzle', difficulty: 'medium', winRate: 0.6, xpReward: 25, itemPool: ['old_key', 'ancient_compass'], itemDropChance: 0.35 } },
        { id: 'c4', text: '喝一口發光的井水 [運氣 6]', requires: { stat: 'luck', dc: 6 }, leadsTo: 'l2_vision',
          encounter: { type: 'gambling', difficulty: 'variable', winRate: 0.5, xpReward: 30, itemPool: ['bone_charm'], itemDropChance: 0.4 } },
      ]
    },
    // Layer 2
    'l2_explore': {
      id: 'l2_explore', title: '井底之謎', description: '你俯身看向水井深處。藍綠色光芒來自井底的一個古老封印——三個螺旋組成的圖案正緩慢轉動。封印上刻著一行小字：「萬物歸一」。水面上浮現著你的倒影，但倒影的嘴角在微笑——你並沒有笑。',
      choices: [
        { id: 'c5', text: '仔細研究封印的結構 [洞察 10]', requires: { stat: 'insight', dc: 10 }, leadsTo: 'l3_seal',
          encounter: { type: 'exploration', difficulty: 'medium', winRate: 0.65, xpReward: 25, itemPool: ['ancient_compass'], itemDropChance: 0.3 } },
        { id: 'c6', text: '直接伸手觸碰封印', requires: null, leadsTo: 'l3_confront',
          encounter: { type: 'story', difficulty: 'none', winRate: 1.0, xpReward: 18, itemPool: ['herb'], itemDropChance: 0.2 } },
      ]
    },
    'l2_awaken': {
      id: 'l2_awaken', title: '甦醒嘗試', description: '你搖晃一個村民的肩膀。他的眼皮顫動了一下，但沒有醒來。你注意到所有村民的手背上都刻著相同的螺旋符號——而且符號的旋轉方向和井底的是相反的。村裡的老鐘樓指針停在凌晨3:33。',
      choices: [
        { id: 'c7', text: '檢查鐘樓的機械 [解謎 8]', requires: { stat: 'puzzle', dc: 8 }, leadsTo: 'l3_clock',
          encounter: { type: 'puzzle', difficulty: 'easy', winRate: 0.8, xpReward: 20, itemPool: ['old_key'], itemDropChance: 0.25 } },
        { id: 'c8', text: '跟著鼾聲的節奏走', requires: null, leadsTo: 'l3_rhythm',
          encounter: { type: 'story', difficulty: 'none', winRate: 1.0, xpReward: 15, itemPool: ['cloth_armor'], itemDropChance: 0.15 } },
      ]
    },
    'l2_clue': {
      id: 'l2_clue', title: '村長書房', description: '村長的書桌上有一本翻開的日記。最後一頁寫著：「封印在井底，解法在星光中。農曆十五月圓之夜，三個螺旋重合之時，封印最弱。」書架上有一張泛黃的照片——村民們站在井邊合影，但照片中每個人的眼睛都是純粹的黑色。',
      choices: [
        { id: 'c9', text: '研究照片中的線索 [洞察 12]', requires: { stat: 'insight', dc: 12 }, leadsTo: 'l3_photo',
          encounter: { type: 'exploration', difficulty: 'medium', winRate: 0.6, xpReward: 28, itemPool: ['enigma_ring'], itemDropChance: 0.35 } },
        { id: 'c10', text: '帶上日記出發', requires: null, leadsTo: 'l3_seal',
          encounter: { type: 'story', difficulty: 'none', winRate: 1.0, xpReward: 20, itemPool: ['silver_dagger'], itemDropChance: 0.2 } },
      ]
    },
    'l2_vision': {
      id: 'l2_vision', title: '幻象深處', description: '井水的力量讓你看到了幻象——村莊地下深處有一座遠古祭壇。祭壇上放著一個打開的盒子，盒子中空無一物。在幻象中，你看到多年前一位村民將某樣東西放入了水井——並非投入，而是被井壁「吞噬」了。',
      choices: [
        { id: 'c11', text: '仔細查看祭壇周圍的符文 [解謎 12]', requires: { stat: 'puzzle', dc: 12 }, leadsTo: 'l3_altar',
          encounter: { type: 'puzzle', difficulty: 'hard', winRate: 0.5, xpReward: 35, itemPool: ['void_blade'], itemDropChance: 0.3 } },
        { id: 'c12', text: '在幻象中四處探索', requires: null, leadsTo: 'l3_confront',
          encounter: { type: 'gambling', difficulty: 'medium', winRate: 0.6, xpReward: 22, itemPool: ['bone_charm'], itemDropChance: 0.25 } },
      ]
    },
    // Layer 3 (deep choices)
    'l3_seal': {
      id: 'l3_seal', title: '封印核心', description: '你站在井底的封印前。三個螺旋分別代表「過去」、「現在」、「未來」。它們轉動的速度不同——過去的轉得最快，未來的最慢。你發現如果你觸碰其中一個螺旋，會影響村莊中對應的時段。',
      choices: [
        { id: 'c13', text: '觸碰「過去」的螺旋——回到詛咒開始前', requires: null, leadsTo: 'end_te',
          encounter: { type: 'story', difficulty: 'none', winRate: 1.0, xpReward: 40, itemPool: ['time_hourglass', 'star_fragment'], itemDropChance: 0.4 } },
        { id: 'c14', text: '同時觸碰三個螺旋——強行解除封印 [生存 14]', requires: { stat: 'survival', dc: 14 }, leadsTo: 'end_he',
          encounter: { type: 'exploration', difficulty: 'hard', winRate: 0.45, xpReward: 35, itemPool: ['soul_reaper'], itemDropChance: 0.3 } },
        { id: 'c15', text: '觸碰「未來」的螺旋——提前看到解除封印的後果', requires: { stat: 'insight', dc: 12 }, leadsTo: 'end_be',
          encounter: { type: 'gambling', difficulty: 'hard', winRate: 0.3, xpReward: 30, itemPool: ['void_blade'], itemDropChance: 0.25 } },
      ]
    },
    'l3_confront': {
      id: 'l3_confront', title: '真相浮現', description: '空氣突然變得沉重。你的影子開始扭曲，漸漸站了起來——影子有了自己的生命。它用低沉的聲音說：「你終於發現了⋯⋯我一直都在這裡。」影子指向村莊的地下。',
      choices: [
        { id: 'c16', text: '面對影子，質問它', requires: null, leadsTo: 'end_te',
          encounter: { type: 'story', difficulty: 'none', winRate: 1.0, xpReward: 35, itemPool: ['phantom_cloak'], itemDropChance: 0.35 } },
        { id: 'c17', text: '跟隨影子的指引', requires: null, leadsTo: 'end_he',
          encounter: { type: 'exploration', difficulty: 'easy', winRate: 0.8, xpReward: 22, itemPool: ['steel_sword'], itemDropChance: 0.25 } },
      ]
    },
    'l3_clock': {
      id: 'l3_clock', title: '鐘樓的秘密', description: '鐘樓內部的齒輪異常——其中一個齒輪上刻著與村民手背一樣的螺旋符號。你轉動齒輪，整個鐘樓開始震動。通往地下的暗門在鐘樓地板下打開，露出通往村莊地下的階梯。',
      choices: [
        { id: 'c18', text: '沿階梯往下走', requires: null, leadsTo: 'end_te',
          encounter: { type: 'exploration', difficulty: 'medium', winRate: 0.7, xpReward: 35, itemPool: ['ancient_compass', 'star_fragment'], itemDropChance: 0.35 } },
        { id: 'c19', text: '先回去叫醒更多村民', requires: null, leadsTo: 'end_he',
          encounter: { type: 'story', difficulty: 'none', winRate: 1.0, xpReward: 20, itemPool: ['torch'], itemDropChance: 0.2 } },
      ]
    },
    'l3_rhythm': {
      id: 'l3_rhythm', title: '鼾聲的秘密', description: '你跟隨鼾聲來到村莊中心的廣場。聲音來自地下——通過水井傳出來。這不是鼾聲，而是某種有節奏的低語，一遍又一遍地重複著同一個詞：「解放⋯⋯解放⋯⋯」',
      choices: [
        { id: 'c20', text: '加入低語，與其共鳴 [運氣 10]', requires: { stat: 'luck', dc: 10 }, leadsTo: 'end_te',
          encounter: { type: 'gambling', difficulty: 'hard', winRate: 0.4, xpReward: 40, itemPool: ['soul_reaper'], itemDropChance: 0.35 } },
        { id: 'c21', text: '打斷低語——破壞水井的發光源', requires: null, leadsTo: 'end_be',
          encounter: { type: 'combat', difficulty: 'medium', winRate: 0.6, xpReward: 20, itemPool: ['iron_sword'], itemDropChance: 0.2 } },
      ]
    },
    'l3_photo': {
      id: 'l3_photo', title: '照片的真相', description: '你仔細研究照片。每個村民眼睛中的黑色不是瞳孔——是被某種東西佔據的痕跡。照片拍攝的日期是三十年前的今天。你在照片角落發現了一個人——他的眼睛是正常的。那是當時的村長。',
      choices: [
        { id: 'c22', text: '去找村長日記中提到的密室', requires: null, leadsTo: 'end_te',
          encounter: { type: 'exploration', difficulty: 'medium', winRate: 0.7, xpReward: 35, itemPool: ['book_of_fate'], itemDropChance: 0.3 } },
        { id: 'c23', text: '根據照片中正常眼睛的人尋找線索', requires: { stat: 'insight', dc: 8 }, leadsTo: 'end_he',
          encounter: { type: 'puzzle', difficulty: 'easy', winRate: 0.75, xpReward: 22, itemPool: ['silver_dagger'], itemDropChance: 0.25 } },
      ]
    },
    'l3_altar': {
      id: 'l3_altar', title: '祭壇之前', description: '祭壇上的盒子內部刻著一行字：「封印的並非詛咒，而是守護。」你明白了——封印是在保護村民免受外界某種存在的侵害。解除封印會釋放村莊，但也會讓那個存在注意到這裡。',
      choices: [
        { id: 'c24', text: '謹慎解除封印——準備好防護', requires: null, leadsTo: 'end_te',
          encounter: { type: 'puzzle', difficulty: 'medium', winRate: 0.65, xpReward: 40, itemPool: ['dragon_scale', 'eternal_dawn'], itemDropChance: 0.35 } },
        { id: 'c25', text: '放棄解除——保持現狀', requires: null, leadsTo: 'end_he',
          encounter: { type: 'story', difficulty: 'none', winRate: 1.0, xpReward: 15, itemPool: ['herb'], itemDropChance: 0.15 } },
      ]
    },
    'end_be': { id: 'end_be', title: '💀 永眠', description: '你觸碰了不該觸碰的力量。睡意如潮水般猛烈湧來——這次，再也沒有醒來的機會。你成為了村莊沉睡的一部分。', choices: [], isEnd: true },
    'end_he': { id: 'end_he', title: '✅ 曙光', description: '你成功喚醒了村民們！雖然遠古封印仍在，但村莊恢復了生機。村民們感激不盡，你帶走了他們贈送的禮物作為紀念。', choices: [], isEnd: true },
    'end_te': { id: 'end_te', title: '✦ 解放', description: '你解除了井底的遠古封印！封印消失的瞬間，整個村莊的睡意消散了。你感受到一股古老的力量流入體內——你不僅拯救了村莊，還獲得了一份來自遠古的饋贈。', choices: [], isEnd: true },
  },
  'forgotten_library': {
    'start': {
      id: 'start', title: '圖書館大廳', description: '書架延伸到視線盡頭，高得看不見天花板。空中飄浮著發光的文字，像螢火蟲般緩慢游動。地板上刻著一行字：「知識即為鑰匙」。你聽到遠方傳來的書頁翻動聲——但你獨自一人。',
      choices: [
        { id: 'c1', text: '追蹤發光的文字 [洞察 8]', requires: { stat: 'insight', dc: 8 }, leadsTo: 'l2_trace',
          encounter: { type: 'exploration', difficulty: 'easy', winRate: 0.7, xpReward: 20, itemPool: ['moon_pendant'], itemDropChance: 0.3 } },
        { id: 'c2', text: '沿書架之間的小徑探索', requires: null, leadsTo: 'l2_wander',
          encounter: { type: 'story', difficulty: 'none', winRate: 1.0, xpReward: 15, itemPool: ['herb'], itemDropChance: 0.2 } },
        { id: 'c3', text: '解讀地板上的古老文字 [解謎 10]', requires: { stat: 'puzzle', dc: 10 }, leadsTo: 'l2_riddle',
          encounter: { type: 'puzzle', difficulty: 'medium', winRate: 0.6, xpReward: 25, itemPool: ['enigma_ring'], itemDropChance: 0.35 } },
        { id: 'c4', text: '隨手翻開離你最近的一本書 [運氣 6]', requires: { stat: 'luck', dc: 6 }, leadsTo: 'l2_random',
          encounter: { type: 'gambling', difficulty: 'variable', winRate: 0.5, xpReward: 30, itemPool: ['bone_charm'], itemDropChance: 0.4 } },
      ]
    },
    'l2_trace': {
      id: 'l2_trace', title: '發光文字', description: '那些文字組成了一句話：「在知識的海洋中，真正的寶藏不在表面。」文字飄向一個隱藏的書架。當你靠近，書架自動移開，露出一條向下的樓梯。樓梯口有一面鏡子，鏡中的你伸出左手——但你的右手才是伸出的那隻。',
      choices: [
        { id: 'c5', text: '觸碰鏡子——穿越它的提示 [洞察 12]', requires: { stat: 'insight', dc: 12 }, leadsTo: 'l3_mirror',
          encounter: { type: 'exploration', difficulty: 'medium', winRate: 0.65, xpReward: 28, itemPool: ['phantom_cloak'], itemDropChance: 0.3 } },
        { id: 'c6', text: '無視鏡子，直接下樓', requires: null, leadsTo: 'l3_descent',
          encounter: { type: 'story', difficulty: 'none', winRate: 1.0, xpReward: 18, itemPool: ['torch'], itemDropChance: 0.2 } },
      ]
    },
    'l2_wander': {
      id: 'l2_wander', title: '書架之間', description: '你發現了一本奇怪的書——書封是空白的，但當你觸碰它時，文字開始逐字浮現，像在回應你的思緒。你想到「出路」，書上顯示：「真正的出路在更深處。」你想到「寶藏」，書上顯示：「知識即是寶藏。」',
      choices: [
        { id: 'c7', text: '問書本更多問題 [解謎 10]', requires: { stat: 'puzzle', dc: 10 }, leadsTo: 'l3_ask',
          encounter: { type: 'puzzle', difficulty: 'medium', winRate: 0.6, xpReward: 25, itemPool: ['book_of_fate'], itemDropChance: 0.3 } },
        { id: 'c8', text: '帶著這本書繼續探索', requires: null, leadsTo: 'l3_descent',
          encounter: { type: 'story', difficulty: 'none', winRate: 1.0, xpReward: 18, itemPool: ['herb'], itemDropChance: 0.15 } },
      ]
    },
    'l2_riddle': {
      id: 'l2_riddle', title: '地板謎題', description: '地板上的圖案是一個巨大的星圖。七顆主星，六條連線——有一顆星被刻意忽略了。你想起剛才看到的飄浮文字中，有一組數字重複出現：3, 7, 1, 9。',
      choices: [
        { id: 'c9', text: '按照數字序列點亮星圖 [解謎 14]', requires: { stat: 'puzzle', dc: 14 }, leadsTo: 'l3_stars',
          encounter: { type: 'puzzle', difficulty: 'hard', winRate: 0.5, xpReward: 35, itemPool: ['star_fragment', 'time_hourglass'], itemDropChance: 0.4 } },
        { id: 'c10', text: '尋找星圖的提示書籍', requires: null, leadsTo: 'l3_ask',
          encounter: { type: 'exploration', difficulty: 'easy', winRate: 0.75, xpReward: 20, itemPool: ['old_key'], itemDropChance: 0.25 } },
      ]
    },
    'l2_random': {
      id: 'l2_random', title: '神秘書頁', description: '你翻開的書中掉出一張書籤——上面寫著通往禁書區的密碼：「當你讀到這句話時，圖書館已經知道了你的存在。你有三次選擇的機會。」三粒發光的字母飄浮在你面前：A、B、C。',
      choices: [
        { id: 'c11', text: '選擇A——「求知」', requires: null, leadsTo: 'l3_descent',
          encounter: { type: 'gambling', difficulty: 'medium', winRate: 0.6, xpReward: 25, itemPool: ['steel_sword'], itemDropChance: 0.25 } },
        { id: 'c12', text: '選擇B——「謹慎」 [生存 8]', requires: { stat: 'survival', dc: 8 }, leadsTo: 'end_he',
          encounter: { type: 'gambling', difficulty: 'easy', winRate: 0.8, xpReward: 18, itemPool: ['cloth_armor'], itemDropChance: 0.15 } },
      ]
    },
    // Layer 3
    'l3_mirror': {
      id: 'l3_mirror', title: '鏡中世界', description: '你觸碰鏡子——指尖穿過冰冷的表面，整個世界翻轉了。你現在站在鏡子另一側的圖書館。這裡的書架是倒置的，書本從地板長到天花板。書脊上的文字你前所未見，但你能理解它們——圖書館在用自己的語言向你展示真相。',
      choices: [
        { id: 'c13', text: '閱讀鏡中圖書館的禁書', requires: null, leadsTo: 'end_te',
          encounter: { type: 'exploration', difficulty: 'hard', winRate: 0.6, xpReward: 45, itemPool: ['book_of_fate', 'eternal_dawn'], itemDropChance: 0.4 } },
        { id: 'c14', text: '穿越鏡子返回——帶著新的理解', requires: null, leadsTo: 'l3_descent',
          encounter: { type: 'story', difficulty: 'none', winRate: 1.0, xpReward: 25, itemPool: ['enigma_ring'], itemDropChance: 0.25 } },
      ]
    },
    'l3_descent': {
      id: 'l3_descent', title: '地下書庫', description: '你沿著螺旋樓梯向下。每下一層，空氣變得越古老。牆壁上刻著歷史——這個圖書館見證了文明的興衰。到達底層時，你看到一扇巨大的青銅門，上面刻著：「真理之門。獻上你最珍貴的知識，方可通行。」',
      choices: [
        { id: 'c15', text: '獻上你從圖書館學到的知識', requires: null, leadsTo: 'end_te',
          encounter: { type: 'puzzle', difficulty: 'medium', winRate: 0.7, xpReward: 40, itemPool: ['time_hourglass', 'star_fragment'], itemDropChance: 0.35 } },
        { id: 'c16', text: '尋找其他入口 [洞察 10]', requires: { stat: 'insight', dc: 10 }, leadsTo: 'end_he',
          encounter: { type: 'exploration', difficulty: 'easy', winRate: 0.75, xpReward: 22, itemPool: ['silver_dagger'], itemDropChance: 0.25 } },
      ]
    },
    'l3_ask': {
      id: 'l3_ask', title: '與書對話', description: '你向那本神奇的書提問：「如何離開這裡？」書頁快速翻動，最終停在一頁。上面用發光的墨水寫著：「離開的方法不是找到出口，而是成為出口的一部分。」書本帶領你來到一堵看似普通的牆前。',
      choices: [
        { id: 'c17', text: '跟隨書的指引穿過牆壁', requires: null, leadsTo: 'end_te',
          encounter: { type: 'story', difficulty: 'none', winRate: 1.0, xpReward: 35, itemPool: ['book_of_fate'], itemDropChance: 0.35 } },
        { id: 'c18', text: '嘗試自己尋找出口', requires: null, leadsTo: 'end_he',
          encounter: { type: 'exploration', difficulty: 'medium', winRate: 0.7, xpReward: 20, itemPool: ['torch'], itemDropChance: 0.2 } },
      ]
    },
    'l3_stars': {
      id: 'l3_stars', title: '星圖解鎖', description: '你成功解開了星圖！地面下沉，形成一道向上的階梯——不是向下，而是向上。階梯通往圖書館最高處的穹頂。在那裡，透過彩繪玻璃，星光直接灑落在一個閱讀台上。台上放著一本打開的書，書頁微微發光。',
      choices: [
        { id: 'c19', text: '閱讀那本發光的書', requires: null, leadsTo: 'end_te',
          encounter: { type: 'story', difficulty: 'none', winRate: 1.0, xpReward: 45, itemPool: ['eternal_dawn', 'star_fragment'], itemDropChance: 0.4 } },
        { id: 'c20', text: '記錄星圖——帶走這份知識', requires: null, leadsTo: 'end_he',
          encounter: { type: 'exploration', difficulty: 'easy', winRate: 0.8, xpReward: 22, itemPool: ['ancient_compass'], itemDropChance: 0.25 } },
      ]
    },
    'end_be': { id: 'end_be', title: '💀 迷失', description: '圖書館的知識洪流淹沒了你的意識。你的身體化作書架上的一本新書——書名就是你的名字。你將永遠成為圖書館的一部分。', choices: [], isEnd: true },
    'end_he': { id: 'end_he', title: '✅ 離開', description: '你找到了圖書館的出口。當你踏出大門的那一刻，背後的圖書館消失了——就像從未存在過一樣。但你帶回的知識和物品是真實的。', choices: [], isEnd: true },
    'end_te': { id: 'end_te', title: '✦ 見證者', description: '你閱讀了禁書區的創世記錄。世界並非唯一——無限流本身是某個更高存在的實驗。你明白了自己的處境，也獲得了改寫部分規則的能力。圖書館認你為「見證者」。', choices: [], isEnd: true },
  },
};

// ======== 結局模板 ========
const BRANCH_ENDINGS = {
  'sleeping_village': [
    { type: 'TE', label: '✦ True End', condition: '解除遠古封印', pathPattern: 'end_te', xpBonus: 300 },
    { type: 'HE', label: '✅ Normal End', condition: '喚醒村民', pathPattern: 'end_he', xpBonus: 150 },
    { type: 'BE', label: '💀 Bad End', condition: '被睡意吞噬', pathPattern: 'end_be', xpBonus: 30 },
  ],
  'forgotten_library': [
    { type: 'TE', label: '✦ True End', condition: '閱讀創世記錄', pathPattern: 'end_te', xpBonus: 300 },
    { type: 'HE', label: '✅ Normal End', condition: '找到出口', pathPattern: 'end_he', xpBonus: 150 },
    { type: 'BE', label: '💀 Bad End', condition: '迷失知識洪流', pathPattern: 'end_be', xpBonus: 30 },
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
      if (newLevel > this.player.level) {
        const gained = newLevel - this.player.level;
        this.player.statPoints += gained * 3;
        this.player.level = newLevel;
      }

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
        if (newLevel > this.player.level) {
          const gained = newLevel - this.player.level;
          this.player.statPoints += gained * 3;
          this.player.level = newLevel;
        }

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

  // AI picks a world for the player based on level
  pickWorldForPlayer() {
    const available = WORLDS.filter(w => this.player.level >= w.minLevel);
    if (available.length === 0) return null;

    // Weight: lower tier worlds are more common for appropriate-level players
    const tierOrder = { F: 0, E: 1, D: 2, C: 3, B: 4, A: 5 };
    const weight = available.map(w => {
      const tier = tierOrder[w.tier] || 0;
      const playerTier = Math.floor(this.player.level / 3);
      const diff = Math.abs(tier - playerTier);
      return Math.max(1, 10 - diff * 2); // closer to player level = higher weight
    });

    const totalWeight = weight.reduce((a, b) => a + b, 0);
    let roll = Math.random() * totalWeight;
    for (let i = 0; i < available.length; i++) {
      roll -= weight[i];
      if (roll <= 0) return available[i];
    }
    return available[available.length - 1];
  },

  // Spend stat points to upgrade an attribute
  spendStatPoint(statName) {
    if (this.player.statPoints <= 0) return false;
    if (!this.player.stats[statName]) return false;
    if (this.player.stats[statName] >= 20) return false; // cap at 20

    this.player.stats[statName]++;
    this.player.statPoints--;
    this.save();
    return true;
  },
};
