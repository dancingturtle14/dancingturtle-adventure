/* ============================================
   無限流模擬器 — 核心遊戲引擎
   多選冒險 · 體力系統 · 物品掉落 · Stat Check
   ============================================ */

// ======== 儲存管理 ========
const Storage = {
  KEY: 'wuxianliu_save',

  save(player) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(player));
    } catch(e) {
      console.warn('Save failed:', e);
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : null;
    } catch(e) {
      console.warn('Load failed:', e);
      return null;
    }
  },

  getGuestPlayer() {
    return createDefaultPlayer('夜鴞', '🦉');
  },

  clear() {
    localStorage.removeItem(this.KEY);
  }
};

// ======== 體力系統 ========
const StaminaSystem = {
  getAvailable(player) {
    const elapsed = (Date.now() - player.lastRecharge) / 1000;
    const recharged = Math.min(
      player.maxStamina - player.stamina,
      Math.floor(elapsed / RECHARGE_SECONDS)
    );
    return player.stamina + recharged;
  },

  canRun(player) {
    return this.getAvailable(player) >= STAMINA_PER_RUN || player.dailyRunsLeft > 0;
  },

  spend(player) {
    if (player.dailyRunsLeft > 0) {
      player.dailyRunsLeft--;
      return true;
    }
    const available = this.getAvailable(player);
    if (available < STAMINA_PER_RUN) return false;
    const remaining = available - STAMINA_PER_RUN;
    player.stamina = remaining;
    player.lastRecharge = Date.now();
    return true;
  },

  checkDailyReset(player) {
    const today = new Date().toISOString().split('T')[0];
    if (player.lastDailyReset !== today) {
      player.dailyRunsLeft = FREE_RUNS_PER_DAY;
      player.lastDailyReset = today;
      return true; // reset happened
    }
    return false;
  }
};

// ======== d20 Stat Check ========
function skillCheck(statName, playerStats, dc) {
  const bonus = playerStats[statName] || 0;
  const roll = Math.floor(Math.random() * 20) + 1;
  const total = roll + bonus;
  return {
    success: total >= dc,
    roll,
    bonus,
    total,
    dc,
    margin: total - dc,
    natural20: roll === 20,
    natural1: roll === 1,
    statName,
  };
}

// ======== 場景對話系統 (Demo mode - 無 AI 時用) ========
const DemoScenes = {
  // 根據 dungeon + scene number 生成
  generate(dungeon, sceneNum) {
    const scenes = this._templates[dungeon.id];
    if (!scenes) return this._fallback();
    const idx = sceneNum % scenes.length;
    return scenes[idx];
  },

  _fallback() {
    return {
      narrative: '你踏入了一個未知的區域。四周充滿了詭異的寂靜，空氣中飄浮著微光。你能感覺到某種存在正在觀察你。',
      choices: [
        { id: 1, text: '仔細觀察四周的環境', stat: 'insight', dc: 8, type: 'exploration' },
        { id: 2, text: '大聲呼叫，看看會發生什麼', stat: null, dc: null, type: 'story', safe: true },
        { id: 3, text: '尋找隱藏的路徑或線索', stat: 'puzzle', dc: 10, type: 'puzzle' },
        { id: 4, text: '跟隨直覺隨機前行', stat: 'luck', dc: 6, type: 'gambling' },
      ]
    };
  },

  _templates: {
    'sleeping_village': [
      {
        narrative: '你走進沉睡村莊。街道上散落著停擺的雜物——翻倒的攤車、未收的衣服、半杯涼透的茶。所有村民都維持著倒下前一刻的姿勢，均勻地呼吸著。村中央的水井散發著淡淡的藍綠色光芒。',
        choices: [
          { id: 1, text: '檢查水井中的發光來源', stat: 'insight', dc: 8, type: 'exploration' },
          { id: 2, text: '嘗試喚醒一個村民', stat: null, dc: null, type: 'story', safe: true },
          { id: 3, text: '搜索村長的屋子尋找線索', stat: 'puzzle', dc: 10, type: 'puzzle' },
          { id: 4, text: '握住那發光的井水喝一口', stat: 'luck', dc: 6, type: 'gambling' },
        ]
      },
      {
        narrative: '村中各處都發現了相同的符號——一個由三個螺旋組成的圖案，刻在門框、井邊、甚至村民的手背上。這些螺旋似乎正以極慢的速度轉動。圖書館的門虛掩著。',
        choices: [
          { id: 1, text: '調查圖書館中的古籍', stat: 'insight', dc: 10, type: 'exploration' },
          { id: 2, text: '沿著螺旋符號最多的路走', stat: null, dc: null, type: 'story', safe: true },
          { id: 3, text: '嘗試繪製反轉的螺旋來破解', stat: 'puzzle', dc: 12, type: 'puzzle' },
          { id: 4, text: '用刀刮掉村民手上的符號', stat: 'luck', dc: 8, type: 'gambling' },
        ]
      },
      {
        narrative: '地下傳來低沉的心跳聲。村莊下方似乎有一個巨大的空洞——而那個空洞正在呼吸。水源從地下被吸取，經過螺旋符號的轉化，散發到整個村莊的空氣中。',
        choices: [
          { id: 1, text: '尋找通往地下的入口', stat: 'insight', dc: 12, type: 'exploration' },
          { id: 2, text: '打破水井，讓藍色氣體散去', stat: null, dc: null, type: 'story', safe: true },
          { id: 3, text: '佈置防禦陣法再下去', stat: 'puzzle', dc: 14, type: 'puzzle' },
          { id: 4, text: '直接跳入水井中的光芒', stat: 'luck', dc: 10, type: 'gambling' },
        ]
      },
    ],
    'forgotten_library': [
      {
        narrative: '你站在遺忘圖書館的大廳中。書架延伸到視線盡頭，高得看不見天花板。空中飄浮著發光的文字，像螢火蟲一樣緩慢移動。地板上刻著一行字——「知識即為鑰匙」。',
        choices: [
          { id: 1, text: '仔細觀察那些發光的文字', stat: 'insight', dc: 8, type: 'exploration' },
          { id: 2, text: '沿著書架之間的小徑探索', stat: null, dc: null, type: 'story', safe: true },
          { id: 3, text: '試著解讀地板上的字', stat: 'puzzle', dc: 10, type: 'puzzle' },
          { id: 4, text: '隨手翻開一本離你最近的書', stat: 'luck', dc: 6, type: 'gambling' },
        ]
      },
      {
        narrative: '你來到一個圓形大廳，七根蠟燭燃燒著，但只有六個燭台。第七根蠟燭——飄浮在半空。地上有新鮮的腳印，似乎不久前有人經過。',
        choices: [
          { id: 1, text: '跟隨那些腳印', stat: 'insight', dc: 10, type: 'exploration' },
          { id: 2, text: '檢查飄浮的蠟燭', stat: null, dc: null, type: 'story', safe: true },
          { id: 3, text: '排列蠟燭的順序來解謎', stat: 'puzzle', dc: 12, type: 'puzzle' },
          { id: 4, text: '吹熄所有蠟燭', stat: 'luck', dc: 8, type: 'gambling' },
        ]
      },
      {
        narrative: '禁書區的大門就在前方，被三道鎖保護著。鎖上分別刻著：過去、現在、未來。每一道鎖都需要回答一個關於世界本質的問題。錯誤的答案會觸發圖書館的防禦機制。',
        choices: [
          { id: 1, text: '仔細研究鎖上的銘文尋找提示', stat: 'insight', dc: 12, type: 'exploration' },
          { id: 2, text: '勇敢地回答問題，接受挑戰', stat: null, dc: null, type: 'story', safe: true },
          { id: 3, text: '用圖書館中的知識推斷答案', stat: 'puzzle', dc: 14, type: 'puzzle' },
          { id: 4, text: '嘗試用蠻力破壞三道鎖', stat: 'combat', dc: 16, type: 'combat' },
        ]
      },
    ],
    'blood_moon_theater': [
      {
        narrative: '血月劇院的大門在午夜自動打開。你被一股無形的力量推入大廳。牆上貼著一張發光的節目單，上面寫著你的名字——以及你今晚的角色：「最後的觀眾」。',
        choices: [
          { id: 1, text: '仔細閱讀節目單的所有規則', stat: 'insight', dc: 10, type: 'exploration' },
          { id: 2, text: '按照指引走向觀眾席', stat: null, dc: null, type: 'story', safe: true },
          { id: 3, text: '尋找節目單上沒寫的隱藏規則', stat: 'puzzle', dc: 12, type: 'puzzle' },
          { id: 4, text: '嘗試轉身離開劇院', stat: 'luck', dc: 8, type: 'gambling' },
        ]
      },
      {
        narrative: '舞台上的演出開始了。演員們戴著白色面具，表演著一場關於背叛的默劇。你注意到其中一位演員的手勢——他在重複向你發出警告。節目的第三幕即將開始。',
        choices: [
          { id: 1, text: '解讀演員的手勢警告', stat: 'insight', dc: 12, type: 'exploration' },
          { id: 2, text: '按照劇本繼續觀看演出', stat: null, dc: null, type: 'story', safe: true },
          { id: 3, text: '記錄所有演員的出場規律', stat: 'puzzle', dc: 14, type: 'puzzle' },
          { id: 4, text: '衝上舞台搶走演員的面具', stat: 'combat', dc: 14, type: 'combat' },
        ]
      },
    ],
    'void_gate': [
      {
        narrative: '虛空之門在你面前敞開——一道由純粹黑暗組成的裂縫，懸浮在半空中。從裂縫中傳來低沉的耳語，像是在召喚你。周圍的一切都在緩慢地被裂縫吸引。',
        choices: [
          { id: 1, text: '觀察裂縫中的虛空結構', stat: 'insight', dc: 12, type: 'exploration' },
          { id: 2, text: '穩住身形，不讓自己被吸入', stat: null, dc: null, type: 'story', safe: true },
          { id: 3, text: '佈置封印陣法關閉裂縫', stat: 'puzzle', dc: 16, type: 'puzzle' },
          { id: 4, text: '直接踏入虛空中探索', stat: 'luck', dc: 12, type: 'gambling' },
        ]
      },
      {
        narrative: '虛空中沒有上下左右之分。你飄浮在一片漆黑中，只有遠處的星光作為參考。一團巨大的陰影在你面前凝聚——虛空之主的化身正在形成。',
        choices: [
          { id: 1, text: '尋找虛空中的弱點', stat: 'insight', dc: 14, type: 'exploration' },
          { id: 2, text: '嘗試與虛空之主溝通', stat: null, dc: null, type: 'story', safe: true },
          { id: 3, text: '準備戰鬥，正面對抗', stat: 'combat', dc: 16, type: 'combat' },
          { id: 4, text: '用你擁有的道具尋找機會', stat: 'luck', dc: 14, type: 'gambling' },
        ]
      },
    ],
  },

  // 根據選擇產生結果
  processChoice(dungeon, sceneNum, choiceId, player) {
    const scenes = this._templates[dungeon.id];
    if (!scenes) return this._fallbackResult(player);

    const idx = sceneNum % scenes.length;
    const scene = scenes[idx];
    const choice = scene.choices.find(c => c.id === choiceId);
    if (!choice) return this._fallbackResult(player);

    let success = true;
    let checkResult = null;
    if (choice.stat) {
      checkResult = skillCheck(choice.stat, player.stats, choice.dc);
      success = checkResult.success;
    }

    // 生成結果描述
    const resultText = success
      ? this._successText(choice, checkResult)
      : this._failText(choice, checkResult);

    // 經驗值
    const baseXP = 15 + sceneNum * 5;
    const xpGained = success ? baseXP : Math.floor(baseXP * 0.3);

    // 物品掉落
    const itemDrop = rollLoot();

    return {
      narrative: resultText,
      success,
      checkResult,
      xpGained,
      itemDrop,
      sceneEnd: sceneNum >= 2, // after 3 scenes, the dungeon ends
    };
  },

  _successText(choice, check) {
    const texts = {
      exploration: [
        '你的觀察力發揮了作用！你發現了一個被忽略的細節——牆角有一道幾乎看不見的縫隙。',
        '你敏銳的感知讓你捕捉到了一閃而過的線索。這個發現將會在後續派上用場。',
        '透過仔細觀察，你注意到環境中的圖案暗藏玄機——它們拼湊成一份地圖。',
      ],
      puzzle: [
        '你的推理能力讓你破解了眼前的謎題！機關發出咔嚓聲，一道隱藏的門打開了。',
        '你成功解讀了那些符號的含義——它們是一段過去文明的文字，記錄著重要信息。',
        '邏輯鏈條在你的腦中連成。你找到了破解這個困境的關鍵。',
      ],
      combat: [
        '你展現了出色的戰鬥技巧！雖然付出了一些代價，但你成功擊退了威脅。',
        '你的戰鬥本能讓你預判了對手的動作。一擊得手！',
        '武力不是唯一的解決方式，但至少現在你有了說話的籌碼。',
      ],
      gambling: [
        '你的直覺從未讓你失望。這次也不例外——你誤打誤撞找到了正確的方向。',
        '運氣站在你這邊！一個隨機的選擇帶來了意想不到的好結果。',
        '冒險的行動獲得了回報。有時候，勇氣比計劃更重要。',
      ],
      story: [
        '你選擇了跟隨內心的指引。有時候，最簡單的選擇會帶來最意想不到的收穫。',
        '你的行動引起了這個世界的共鳴。你感到某種力量在關注著你。',
        '平靜的選擇往往能讓你發現被忽略的美好。你在這個過程中獲得了一些新的領悟。',
      ],
    };

    const pool = texts[choice.type] || texts.story;
    return pool[Math.floor(Math.random() * pool.length)] +
      (check ? `\n\n🎲 骰子：${check.roll} + ${check.bonus}(${check.statName}) = ${check.total} ≥ ${check.dc} ✅` : '');
  },

  _failText(choice, check) {
    const texts = {
      exploration: [
        '你努力觀察，但周圍的環境太過隱晦。你錯過了關鍵的線索——至少暫時如此。',
        '光線太暗，你的視線模糊不清。什麼也沒發現。',
      ],
      puzzle: [
        '這個謎題超出了你目前的理解範圍。你感到一陣挫折——或許你需要更多信息。',
        '你的推理走進了死胡同。那些符號的含義仍然是一個謎。',
      ],
      combat: [
        '你的攻擊被輕易化解了！對方的實力遠超你的預期。你被迫後退，尋找新的機會。',
        '戰鬥對你來說太過艱難。你受了點輕傷，但勉強逃脫了。',
      ],
      gambling: [
        '這次你的運氣不好。冒險的行動帶來了反效果——你損失了一些時間和精力。',
        '運氣不是永遠可靠的。這次你賭錯了。',
      ],
      story: [
        '這個選擇似乎沒有帶來預期的效果。但至少你沒有因此陷入危險。',
        '世界沒有因為你的行動而改變。也許你需要更大膽一些。',
      ],
    };

    const pool = texts[choice.type] || texts.story;
    return pool[Math.floor(Math.random() * pool.length)] +
      (check ? `\n\n🎲 骰子：${check.roll} + ${check.bonus}(${check.statName}) = ${check.total} < ${check.dc} ❌` : '');
  },

  _fallbackResult(player) {
    return {
      narrative: '你完成了這個場景的探索，準備迎接下一個挑戰。',
      success: true,
      checkResult: null,
      xpGained: 10,
      itemDrop: null,
      sceneEnd: false,
    };
  },

  // 最終場景結果
  finale(dungeon, outcomes, player) {
    const successes = outcomes.filter(o => o.success).length;
    const totalScenes = outcomes.length;

    // 判斷結局
    let ending;
    if (successes === totalScenes) {
      ending = { type: 'TE', label: '✦ True End', desc: dungeon.teCondition || '完美通關！', xpBonus: 300 };
    } else if (successes >= Math.ceil(totalScenes / 2)) {
      ending = { type: 'HE', label: '✅ Normal End', desc: dungeon.heCondition || '通關成功', xpBonus: 150 };
    } else {
      ending = { type: 'BE', label: '💀 Bad End', desc: dungeon.beCondition || '冒險失敗', xpBonus: 30 };
    }

    return ending;
  }
};

// ======== 當前遊戲狀態 ========
const Game = {
  player: null,
  currentDungeon: null,
  currentScene: null,
  sceneNumber: 0,
  outcomes: [],
  isProcessing: false,

  init() {
    this.loadPlayer();

    // Check daily reset
    StaminaSystem.checkDailyReset(this.player);
    this.save();
  },

  loadPlayer() {
    this.player = Storage.load() || Storage.getGuestPlayer();
  },

  save() {
    Storage.save(this.player);
  },

  startRun(dungeonId) {
    if (this.isProcessing) return false;

    const dungeon = DUNGEONS.find(d => d.id === dungeonId);
    if (!dungeon) return false;

    // Check stamina
    if (!StaminaSystem.canRun(this.player)) return false;

    // Spend stamina
    StaminaSystem.spend(this.player);

    // Initialize run
    this.currentDungeon = dungeon;
    this.currentScene = null;
    this.sceneNumber = 0;
    this.outcomes = [];
    this.isProcessing = false;
    this.save();

    return true;
  },

  getCurrentScene() {
    return DemoScenes.generate(this.currentDungeon, this.sceneNumber);
  },

  makeChoice(choiceId) {
    if (this.isProcessing || !this.currentDungeon) return null;
    this.isProcessing = true;

    const result = DemoScenes.processChoice(
      this.currentDungeon,
      this.sceneNumber,
      choiceId,
      this.player
    );

    this.outcomes.push(result);
    this.sceneNumber++;

    // Apply XP
    this.player.exp += result.xpGained;
    const newLevel = calcLevel(this.player.exp);
    if (newLevel > this.player.level) {
      this.player.level = newLevel;
    }

    // Apply item drop
    if (result.itemDrop) {
      this.player.items.push(result.itemDrop);
    }

    // Check if run ends
    const isEnd = result.sceneEnd || this.sceneNumber >= 3;
    if (isEnd) {
      const ending = DemoScenes.finale(this.currentDungeon, this.outcomes, this.player);
      result.ending = ending;
      result.isEnd = true;

      // Update player stats for ending
      if (ending.type === 'TE') this.player.teCount++;
      else if (ending.type === 'HE') this.player.heCount++;
      else this.player.beCount++;

      this.player.completedRuns++;
      this.player.exp += ending.xpBonus;

      // Divine alert
      if (result.itemDrop && result.itemDrop.rarity === 'divine') {
        this.player.divineFound = true;
      }

      // Level check again after bonus XP
      const finalLevel = calcLevel(this.player.exp);
      if (finalLevel > this.player.level) {
        this.player.level = finalLevel;
      }

      // Reset dungeon state
      this.currentDungeon = null;
      this.currentScene = null;
      this.sceneNumber = 0;
      this.outcomes = [];
    }

    this.save();
    this.isProcessing = false;
    return result;
  },

  getStaminaDisplay() {
    const available = StaminaSystem.getAvailable(this.player);
    return {
      current: available,
      max: this.player.maxStamina,
      dailyLeft: this.player.dailyRunsLeft,
      canRun: StaminaSystem.canRun(this.player),
    };
  },

  getAvailableDungeons() {
    return DUNGEONS.filter(d => this.player.level >= d.minLevel);
  },

  sellItem(instanceId) {
    const idx = this.player.items.findIndex(i => i.instanceId === instanceId);
    if (idx === -1) return false;

    const item = this.player.items[idx];
    const price = Math.floor((item.sellPrice || 0) * (0.2 + Math.random() * 0.1)); // 20-30%
    this.player.currency += price;
    this.player.items.splice(idx, 1);
    this.save();
    return { price, itemName: item.name };
  },

  // 物品轉移（交易用）
  transferItem(fromPlayer, toPlayer, instanceId) {
    // 呢個 function 之後會用於 Supabase 版本
  }
};
