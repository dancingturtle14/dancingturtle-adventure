/* ============================================
   無限流模擬器 — 核心遊戲引擎
   AI 即時生成 · 世界歷史追蹤 · 場景進度控制
   ============================================ */

// ======== 世界概念（純主題，無分支）=======
const WORLD_THEMES = [
  { id: 'wuxia',     name: '俠客世界',  tier: 'F', minLevel: 1,
    theme: '武俠江湖', flavor: '江湖恩怨、門派紛爭、內功心法、絕世神兵',
    teHint: '成為武林至尊或解開武林千年之謎', },
  { id: 'magic',     name: '魔法紀元',  tier: 'F', minLevel: 1,
    theme: '奇幻魔法', flavor: '魔法學院、古老咒語、元素精靈、神秘古龍',
    teHint: '掌握世界根源的魔法奧秘', },
  { id: 'fairytale', name: '童話國度',  tier: 'E', minLevel: 2,
    theme: '童話幻想', flavor: '迪士尼風格、魔法森林、會說話的動物、詛咒與祝福',
    teHint: '打破最古老的童話詛咒', },
  { id: 'cyberpunk', name: '銀幕都市',  tier: 'D', minLevel: 3,
    theme: '賽博龐克', flavor: '霓虹街道、巨型企業、駭客、義體改造、AI叛亂',
    teHint: '揭露城市背後的終極真相', },
  { id: 'cthulhu',   name: '克蘇魯深淵', tier: 'C', minLevel: 5,
    theme: '克蘇魯神話', flavor: '不可名狀的恐懼、理智值、古老儀式、深海教團',
    teHint: '直面宇宙深處的存在並存活', },
  { id: 'western',   name: '荒野邊境',  tier: 'B', minLevel: 8,
    theme: '西部冒險', flavor: '荒原小鎮、左輪槍決鬥、賞金獵人、黃金傳說',
    teHint: '解開邊境上最駭人的傳說之謎', },
  { id: 'egypt',     name: '古埃及紀元', tier: 'A', minLevel: 12,
    theme: '古埃及神話', flavor: '法老陵墓、金字塔、神祇試煉、亡者之書',
    teHint: '取得眾神認可，改寫生死規則', },
  { id: 'steampunk', name: '蒸氣革命',  tier: 'B', minLevel: 8,
    theme: '蒸氣龐克', flavor: '維多利亞時代、蒸氣機械、飛空艇、齒輪之城',
    teHint: '阻止一場足以毀滅文明的機械災難', },
  { id: 'dinosaur',  name: '原始侏羅紀', tier: 'E', minLevel: 2,
    theme: '史前世界', flavor: '恐龍、遠古叢林、滅絕之謎、隕石降臨',
    teHint: '找到離開這個時代的方法或改寫歷史', },
  { id: 'space',     name: '星際漂流',  tier: 'A', minLevel: 12,
    theme: '太空科幻', flavor: '外星文明、星艦、異形、黑洞、超光速航行',
    teHint: '與外星文明建立聯繫或逃離宇宙級威脅', },
];

// ======== d20 判定 ========
function skillCheck(statName, playerStats, dc) {
  const bonus = playerStats[statName] || 0;
  const roll = Math.floor(Math.random() * 20) + 1;
  const total = roll + bonus;
  return {
    success: total >= dc, roll, bonus, total, dc,
    margin: total - dc,
    natural20: roll === 20, natural1: roll === 1,
    statName
  };
}

// ======== 等級計算 ========
const EXP_TABLE = [0, 100, 250, 500, 850, 1300, 1900, 2700, 3700, 5000, 6500, 8500, 11000, 14000, 17500, 22000, 27500, 34500, 43000, 55000];
function calcLevel(exp) {
  for (let i = EXP_TABLE.length - 1; i >= 0; i--) {
    if (exp >= EXP_TABLE[i]) return i + 1;
  }
  return 1;
}

// ======== 體力系統（Supabase sync）=======
const RECHARGE_SECONDS = 300;  // 5 min per stamina point
const STAMINA_PER_RUN = 20;
const FREE_RUNS_PER_DAY = 5;

const StaminaSystem = {
  getAvailable(player) {
    if (!player) return 0;
    const elapsed = (Date.now() - (player.lastRecharge || Date.now())) / 1000;
    const max = player.maxStamina || 100;
    const recharged = Math.min(max - (player.stamina || 0), Math.floor(elapsed / RECHARGE_SECONDS));
    return (player.stamina || 0) + recharged;
  },
  canRun(player) {
    return this.getAvailable(player) >= STAMINA_PER_RUN || (player.dailyRunsLeft || 0) > 0;
  },
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

// ======== 稀有度權重 ========
const RARITY_WEIGHTS = { common: 600, uncommon: 250, rare: 100, epic: 40, legendary: 9, divine: 1 };

// ======== 遊戲狀態引擎 ========
const Game = {
  player: null,
  currentRun: {       // 當前正在進行的輪迴
    worldTheme: null,
    scenes: [],       // [{narrative, choices, choice, outcome, sceneType}]
    sceneCount: 0,
    ending: null,     // 'TE'|'HE'|'BE'
    xpTotal: 0,
    items: [],
    startedAt: null,
  },
  isProcessing: false,
  isAIGenerating: false,

  // ── 初始化 ──
  init() {
    // Player loaded by supabase-integration.js
    if (this.player) {
      StaminaSystem.checkDailyReset(this.player);
    }
  },

  // ── 世界選擇（按等級權重抽一個）──
  pickWorldForPlayer() {
    const worldList = WORLD_THEMES;
    // 高級玩家可以入低級世界，低級唔可以入高級
    const tierOrder = { F: 0, E: 1, D: 2, C: 3, B: 4, A: 5 };
    const available = worldList.filter(w => this.player.level >= w.minLevel);
    if (available.length === 0) return worldList[0];

    // 權重：玩家等級越接近世界等級機率越高
    const playerTier = Math.min(5, Math.floor(this.player.level / 3));
    const weights = available.map(w => {
      const t = tierOrder[w.tier] || 0;
      const diff = Math.abs(t - playerTier);
      return Math.max(1, 12 - diff * 2);
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < available.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return available[i];
    }
    return available[available.length - 1];
  },

  // ── 獲取玩家喺某個世界嘅歷史（for AI context）──
  async getWorldRunHistory(worldId) {
    if (!this.player?.id || !SUPABASE) return { entries: 0, bestEnding: null, recentRuns: [] };
    try {
      const { data: worldHist } = await SUPABASE.from('world_history')
        .select('*')
        .eq('player_id', this.player.id)
        .eq('world_id', worldId)
        .maybeSingle();
      
      const { data: recentRuns } = await SUPABASE.from('runs')
        .select('*')
        .eq('player_id', this.player.id)
        .eq('dungeon_world_id', worldId)
        .order('started_at', { ascending: false })
        .limit(5);
      
      return {
        entries: worldHist?.entry_count || 0,
        bestEnding: worldHist?.best_ending || null,
        recentRuns: (recentRuns || []).map(r => ({
          ending: r.ending_type,
          xp: r.xp_gained,
          items: r.items_gained || [],
          date: r.completed_at,
        })),
      };
    } catch {
      return { entries: 0, bestEnding: null, recentRuns: [] };
    }
  },

  // ── 開始新輪迴（AI 生成開場）──
  async startRun() {
    if (this.isProcessing) return null;
    this.isProcessing = true;

    // 檢查體力
    StaminaSystem.checkDailyReset(this.player);
    if (!StaminaSystem.canRun(this.player)) {
      this.isProcessing = false;
      return { error: '體力不足' };
    }

    // 檢查 AI Key
    if (!AIGM || !AIGM.apiKey) {
      this.isProcessing = false;
      return { error: 'server_down' };
    }

    // 扣體力
    StaminaSystem.spend(this.player);
    await this._save();

    // 抽世界
    const world = this.pickWorldForPlayer();
    const history = await this.getWorldRunHistory(world.id);

    // 建立新 run
    this.currentRun = {
      worldTheme: world,
      scenes: [],
      sceneCount: 0,
      ending: null,
      xpTotal: 0,
      items: [],
      startedAt: Date.now(),
    };

    // AI 生成開場
    this.isAIGenerating = true;
    try {
      const opening = await AIGM.generateOpening(world, this.player, history);
      if (!opening) throw new Error('AI returned null');

      this.currentRun.scenes.push({
        role: 'gm',
        narrative: opening.narrative,
        choices: opening.choices,
        sceneType: opening.scene_type || 'opening',
        endingProximity: opening.ending_proximity || 0,
        choice: null,
        outcome: null,
      });
      this.currentRun.sceneCount = 1;
    } catch (e) {
      this.isProcessing = false;
      this.isAIGenerating = false;
      this.currentRun = { worldTheme: null, scenes: [], sceneCount: 0, ending: null, xpTotal: 0, items: [], startedAt: null };
      return { error: `AI 生成失敗: ${e.message}` };
    }
    this.isAIGenerating = false;
    this.isProcessing = false;
    return this.currentRun;
  },

  // ── 玩家選擇選項 → AI 生成結果 + 下一幕 ──
  async makeChoice(choiceIndex) {
    if (this.isProcessing || this.isAIGenerating) return null;
    if (!this.currentRun || !this.currentRun.worldTheme) return null;

    this.isProcessing = true;

    const currentScene = this.currentRun.scenes[this.currentRun.scenes.length - 1];
    if (!currentScene || !currentScene.choices) {
      this.isProcessing = false;
      return null;
    }

    const choice = currentScene.choices[choiceIndex];
    if (!choice) {
      this.isProcessing = false;
      return null;
    }

    const world = this.currentRun.worldTheme;
    const player = this.player;

    // ── Stat Check ──
    let checkResult = null;
    if (choice.stat && choice.dc != null) {
      checkResult = skillCheck(choice.stat, player.stats, choice.dc);
    }

    // ── 選擇帶有 leadsTo: "ending" → 直接觸發結局 ──
    if (choice.leadsTo === 'ending') {
      this.isAIGenerating = true;
      try {
        const endingScene = await AIGM.forceEnding(
          this.currentRun.worldTheme,
          this.player,
          this.currentRun
        );
        if (!endingScene) throw new Error('forceEnding returned null');

        currentScene.choice = choice;
        currentScene.outcome = {
          choiceIndex, choice, checkResult: null,
          success: true, narrative: endingScene.narrative || '故事迎來了結局。',
          xpGained: 0, itemDrop: null,
        };
        this.currentRun.sceneCount++;

        // 套用結局
        this.currentRun.ending = endingScene.endingType || 'HE';
        this.currentRun.scenes.push({
          role: 'gm', narrative: endingScene.narrative,
          choices: [], sceneType: 'ending', endingProximity: 100,
          choice: null, outcome: null,
        });

        const bonusXp = { TE: 300, HE: 150, BE: 30 };
        const endingXp = bonusXp[this.currentRun.ending] || 50;
        this.currentRun.xpTotal += endingXp;
        player.exp += endingXp;

        if (this.currentRun.ending === 'TE') player.teCount = (player.teCount || 0) + 1;
        else if (this.currentRun.ending === 'HE') player.heCount = (player.heCount || 0) + 1;
        else player.beCount = (player.beCount || 0) + 1;
        player.completedRuns = (player.completedRuns || 0) + 1;

        const newLevel = calcLevel(player.exp);
        if (newLevel > player.level) {
          const gained = newLevel - player.level;
          player.statPoints = (player.statPoints || 0) + gained * 3;
          player.level = newLevel;
        }

        await this._save();
        await this._saveRunToDB();

        this.isAIGenerating = false;
        this.isProcessing = false;
        return { ending: this.currentRun.ending, ...endingScene };
      } catch (e) {
        this.isAIGenerating = false;
        this.isProcessing = false;
        return { error: `結局生成失敗: ${e.message}` };
      }
    }

    // ── 告訴 AI 玩家選擇咗咩 + 判定結果 ──
    this.isAIGenerating = true;
    try {
      const sceneResult = await AIGM.generateNextScene({
        world,
        run: this.currentRun,
        currentScene,
        choice,
        check: checkResult,
        player,
        sceneNumber: this.currentRun.sceneCount,
      });

      // ── 應用獎勵 ──
      if (sceneResult.xpGained) {
        this.currentRun.xpTotal += sceneResult.xpGained;
        player.exp += sceneResult.xpGained;
      }

      if (sceneResult.itemDrop) {
        this.currentRun.items.push(sceneResult.itemDrop);
        if (!player.items) player.items = [];
        player.items.push(sceneResult.itemDrop);
        if (typeof ItemAPI !== 'undefined' && ItemAPI.add) {
          ItemAPI.add(sceneResult.itemDrop).catch(() => {});
        }
      }

      // ── 記錄選擇 ──
      const outcome = {
        choiceIndex,
        choice,
        checkResult,
        success: sceneResult.success !== false,
        narrative: sceneResult.outcomeNarrative || '你完成了行動。',
        xpGained: sceneResult.xpGained || 0,
        itemDrop: sceneResult.itemDrop || null,
      };

      currentScene.choice = choice;
      currentScene.outcome = outcome;
      this.currentRun.sceneCount++;

      // ── 檢查係唔係 ending ──
      const isEndingBySceneType = sceneResult.nextScene?.scene_type === 'ending' ||
        (sceneResult.nextScene?.ending_proximity >= 85 && this.currentRun.sceneCount >= 7);

      if (sceneResult.isEnding || this.currentRun.sceneCount >= 30 || isEndingBySceneType) {
        // Ending 場景
        if (isEndingBySceneType && !sceneResult.isEnding) {
          // 由 scene_type/proximity 觸發：用 AI 生成嘅 nextScene 做結局
          this.currentRun.scenes.push({
            role: 'gm',
            narrative: sceneResult.nextScene.narrative,
            choices: sceneResult.nextScene.choices || [],
            sceneType: 'ending',
            endingProximity: 100,
            choice: null,
            outcome: null,
          });
          this.currentRun.ending = sceneResult.nextScene.ending_type || 'HE';
        } else {
          this.currentRun.ending = sceneResult.endingType || 'HE';
        }
        const bonusXp = { TE: 300, HE: 150, BE: 30 };
        const endingXp = bonusXp[this.currentRun.ending] || 50;
        this.currentRun.xpTotal += endingXp;
        player.exp += endingXp;

        // 統計
        if (this.currentRun.ending === 'TE') player.teCount = (player.teCount || 0) + 1;
        else if (this.currentRun.ending === 'HE') player.heCount = (player.heCount || 0) + 1;
        else player.beCount = (player.beCount || 0) + 1;
        player.completedRuns = (player.completedRuns || 0) + 1;

        // 檢查升級
        const newLevel = calcLevel(player.exp);
        if (newLevel > player.level) {
          const gained = newLevel - player.level;
          player.statPoints = (player.statPoints || 0) + gained * 3;
          player.level = newLevel;
        }

        // Save to Supabase
        await this._save();
        await this._saveRunToDB();

        this.isAIGenerating = false;
        this.isProcessing = false;
        return { ending: this.currentRun.ending, ...sceneResult };
      }

      // ── 下一幕 ──
      if (sceneResult.nextScene) {
        this.currentRun.scenes.push({
          role: 'gm',
          narrative: sceneResult.nextScene.narrative,
          choices: sceneResult.nextScene.choices,
          sceneType: sceneResult.nextScene.scene_type || 'development',
          endingProximity: sceneResult.nextScene.ending_proximity || 0,
          choice: null,
          outcome: null,
        });
      }

      await this._save();

      this.isAIGenerating = false;
      this.isProcessing = false;
      return {
        outcome,
        nextScene: sceneResult.nextScene,
        isEnding: false,
        sceneCount: this.currentRun.sceneCount,
      };
    } catch (e) {
      this.isAIGenerating = false;
      this.isProcessing = false;
      return { error: `AI 響應失敗: ${e.message}` };
    }
  },

  // ── 強制結束（第 30 輪硬 cap）──
  async forceEnding() {
    if (!this.currentRun) return null;
    this.isAIGenerating = true;
    try {
      const endingScene = await AIGM.forceEnding(
        this.currentRun.worldTheme,
        this.player,
        this.currentRun
      );
      this.currentRun.ending = endingScene.endingType || 'HE';
      const bonusXp = { TE: 300, HE: 150, BE: 30 };
      const xp = bonusXp[this.currentRun.ending] || 50;
      this.currentRun.xpTotal += xp;
      this.player.exp += xp;
      this.currentRun.scenes.push({
        role: 'gm',
        narrative: endingScene.narrative,
        choices: [],
        sceneType: 'ending',
        endingProximity: 100,
        choice: null,
        outcome: null,
      });
      await this._save();
      await this._saveRunToDB();
      this.isAIGenerating = false;
      return endingScene;
    } catch (e) {
      this.isAIGenerating = false;
      return null;
    }
  },

  // ── 儲存到 Supabase ──
  async _save() {
    if (!SUPABASE || !this.player?.id) return;
    try {
      await SUPABASE.from('players').update({
        level: this.player.level,
        exp: this.player.exp,
        currency: this.player.currency || 0,
        stamina_current: Math.floor(StaminaSystem.getAvailable(this.player)),
        stamina_last_recharge: new Date(this.player.lastRecharge || Date.now()).toISOString(),
        daily_runs_used: Math.max(0, FREE_RUNS_PER_DAY - (this.player.dailyRunsLeft || 0)),
        last_daily_reset: this.player.lastDailyReset || new Date().toISOString().split('T')[0],
        stats: this.player.stats,
        stat_points: this.player.statPoints || 0,
        completed_runs: this.player.completedRuns || 0,
        te_count: this.player.teCount || 0,
        he_count: this.player.heCount || 0,
        be_count: this.player.beCount || 0,
        divine_found: this.player.divineFound || false,
        updated_at: new Date().toISOString(),
      }).eq('id', this.player.id);
    } catch (e) {
      console.warn('Save error:', e.message);
    }
  },

  // ── 儲存 run 記錄到 Supabase ──
  async _saveRunToDB() {
    if (!SUPABASE || !this.player?.id || !this.currentRun?.worldTheme) return;
    const run = this.currentRun;
    try {
      await SUPABASE.from('runs').insert({
        player_id: this.player.id,
        dungeon_world_id: run.worldTheme.id,
        ending_type: run.ending || 'HE',
        xp_gained: run.xpTotal || 0,
        items_gained: run.items.map(i => i.name || i.templateId || '').filter(Boolean),
        completed_at: new Date().toISOString(),
      });

      // Update world history
      const { data: existing } = await SUPABASE.from('world_history')
        .select('*')
        .eq('player_id', this.player.id)
        .eq('world_id', run.worldTheme.id)
        .maybeSingle();

      const endingRank = { TE: 3, HE: 2, BE: 1 };
      await SUPABASE.from('world_history').upsert({
        player_id: this.player.id,
        world_id: run.worldTheme.id,
        entry_count: (existing?.entry_count || 0) + 1,
        te_count: (existing?.te_count || 0) + (run.ending === 'TE' ? 1 : 0),
        he_count: (existing?.he_count || 0) + (run.ending === 'HE' ? 1 : 0),
        be_count: (existing?.be_count || 0) + (run.ending === 'BE' ? 1 : 0),
        best_ending: (!existing?.best_ending || endingRank[run.ending] > endingRank[existing.best_ending])
          ? run.ending : existing.best_ending,
        last_entered_at: new Date().toISOString(),
      }, { onConflict: 'player_id,world_id' });
    } catch (e) {
      console.warn('Save run error:', e.message);
    }
  },

  // ── UI Data ──
  getStaminaDisplay() {
    const available = StaminaSystem.getAvailable(this.player);
    return {
      current: available,
      max: this.player.maxStamina || 100,
      dailyLeft: this.player.dailyRunsLeft || 0,
      canRun: StaminaSystem.canRun(this.player),
    };
  },

  getCurrentScene() {
    if (!this.currentRun || this.currentRun.scenes.length === 0) return null;
    return this.currentRun.scenes[this.currentRun.scenes.length - 1];
  },

  // ── 售賣物品 ──
  sellItem(instanceId) {
    const idx = (this.player.items || []).findIndex(i => i.instanceId === instanceId);
    if (idx === -1) return false;
    const item = this.player.items[idx];
    const price = Math.floor((item.sellPrice || 0) * (0.2 + Math.random() * 0.1));
    this.player.currency = (this.player.currency || 0) + price;
    this.player.items.splice(idx, 1);
    if (SUPABASE && item.instanceId) {
      SUPABASE.from('items').delete().eq('id', item.instanceId).catch(() => {});
    }
    this._save();
    return { price, itemName: item.name };
  },

  // ── 分配屬性點 ──
  spendStatPoint(statName) {
    if ((this.player.statPoints || 0) <= 0) return false;
    if (!this.player.stats[statName]) return false;
    if (this.player.stats[statName] >= 20) return false;
    this.player.stats[statName]++;
    this.player.statPoints--;
    this._save();
    return true;
  },
};
