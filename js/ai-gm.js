/* ============================================
   無限流模擬器 — AI GM 模組
   OpenRouter 整合 · 結構化 JSON 輸出 · 多選場景
   ============================================ */

const AIGM = {
  // OpenRouter config
  apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
  apiKey: '',  // user fills via settings
  defaultModel: 'openrouter/anthropic/claude-3.5-sonnet',

  // Settings
  settings: {
    model: localStorage.getItem('aigm_model') || 'openrouter/anthropic/claude-3.5-sonnet',
    temperature: 0.8,
    maxTokens: 1200,
  },

  /**
   * Generate a scene with choices using AI
   * Falls back to DemoScenes if no API key
   */
  async generateScene(dungeon, sceneNum, player, history) {
    // If no API key, use demo
    if (!this.apiKey) {
      return DemoScenes.generate(dungeon, sceneNum);
    }

    try {
      const systemPrompt = this._buildSystemPrompt(dungeon, player);
      const messages = this._buildMessages(dungeon, sceneNum, player, history);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://dancingturtle.github.io',
          'X-Title': 'DancingTurtle 無限流模擬器',
        },
        body: JSON.stringify({
          model: this.settings.model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
          ],
          temperature: this.settings.temperature,
          max_tokens: this.settings.maxTokens,
          response_format: { type: 'json_object' },
        })
      });

      if (!response.ok) {
        throw new Error(`API ${response.status}`);
      }

      const data = await response.json();
      const content = JSON.parse(data.choices[0].message.content);

      return this._validateScene(content, dungeon);

    } catch (e) {
      console.warn('AI GM failed, fallback to demo:', e.message);
      return DemoScenes.generate(dungeon, sceneNum);
    }
  },

  /**
   * Generate outcome after player makes a choice
   */
  async generateOutcome(dungeon, sceneNum, player, choice, history, prevScenes) {
    if (!this.apiKey) {
      return this._demoOutcome(dungeon, sceneNum, choice, player);
    }

    try {
      const systemPrompt = `你是「無限流模擬器」的 AI GM。
玩家剛在一個場景中做出選擇，請根據以下信息生成結果。

【規則】
1. 根據玩家的選擇和屬性值，描述發生的結果
2. 結果應有沉浸感，使用繁體中文
3. 包含 d20 骰子判定結果（如果有 stat check）
4. 返回 JSON 格式

【輸出格式】
{
  "narrative": "結果描述文字...",
  "success": true,
  "xpGained": 25,
  "itemDrop": null 或 { "templateId": "item_id" },
  "isSceneEnd": false
}

物品掉落：30% 機率掉落，用 rollRarity() 決定稀有度。
經驗值：成功 15-40，失敗 5-15。
如果場景完成 3 個，isSceneEnd = true。`;

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://dancingturtle.github.io',
          'X-Title': 'DancingTurtle 無限流模擬器',
        },
        body: JSON.stringify({
          model: this.settings.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify({
              dungeon: dungeon.name,
              tier: dungeon.tier,
              sceneNumber: sceneNum + 1,
              playerStats: player.stats,
              playerItems: player.items.map(i => i.name),
              choice: {
                text: choice.text,
                type: choice.type,
                stat: choice.stat,
                dc: choice.dc,
              },
              previousScenes: prevScenes.slice(-2),
              history: history.slice(-3),
            })}
          ],
          temperature: 0.7,
          max_tokens: 800,
          response_format: { type: 'json_object' },
        })
      });

      if (!response.ok) throw new Error(`API ${response.status}`);

      const data = await response.json();
      const content = JSON.parse(data.choices[0].message.content);

      return {
        narrative: content.narrative || '你完成了行動。',
        success: content.success !== false,
        xpGained: Math.min(50, Math.max(5, content.xpGained || 15)),
        itemDrop: content.itemDrop || null,
        isEnd: content.isSceneEnd || sceneNum >= 2,
      };

    } catch (e) {
      console.warn('AI GM outcome fallback:', e.message);
      return this._demoOutcome(dungeon, sceneNum, choice, player);
    }
  },

  /**
   * Build system prompt for scene generation
   */
  _buildSystemPrompt(dungeon, player) {
    return `你是一個「無限流模擬器」的 AI GM。

【世界觀設定】
- 玩家被選中進入「無限流世界」，必須穿越不同副本
- 每個副本是一個獨立的世界，有自己的規則和故事
- 副本有 F(最簡單) 到 A(極難) 的難度分級
- 每個副本有三種結局：BE(壞結局), HE(正常通關), TE(True End完美結局)
- 玩家可以在大廳與其他玩家互動、交易物品

【當前副本】
名稱：${dungeon.name}
難度：${dungeon.tier}級（${dungeon.type}）
描述：${dungeon.description}

【玩家資訊】
等級：Lv.${player.level}
屬性：洞察 ${player.stats.insight}, 生存 ${player.stats.survival}, 戰鬥 ${player.stats.combat}, 解謎 ${player.stats.puzzle}, 運氣 ${player.stats.luck}
持有物品：${player.items.map(i => i.name).join(', ') || '無'}

【生成規則——至關重要】
1. 生成一段 3-5 句的場景敘述（繁體中文），描述玩家當前面對的環境和事件
2. 生成 4 個選項（A/B/C/D），每個選項必須不同
3. 選項類型必須多樣：至少包含 exploration / combat / puzzle / story / gambling 中的 4 種
4. 其中一個選項為「安全選項」（stat=null, dc=null, type=story）
5. 其他 3 個選項綁定 stat + DC，DC 值參考玩家屬性（比屬性值高 3-8 左右）
6. 不要替玩家做決定，每個選項應有明確的行動描述

【輸出格式 — 必須嚴格遵守 JSON】
{
  "narrative": "場景敘述文字...",
  "choices": [
    { "id": 1, "text": "行動描述", "stat": "insight", "dc": 10, "type": "exploration" },
    { "id": 2, "text": "行動描述", "stat": null, "dc": null, "type": "story" },
    { "id": 3, "text": "行動描述", "stat": "combat", "dc": 12, "type": "combat" },
    { "id": 4, "text": "行動描述", "stat": "luck", "dc": 8, "type": "gambling" }
  ]
}

Stat 只可以是：insight, survival, combat, puzzle, luck 之一。
Type 只可以是：exploration, combat, puzzle, story, gambling 之一。`;
  },

  /**
   * Build conversation messages for context
   */
  _buildMessages(dungeon, sceneNum, player, history) {
    const msgs = [];

    // Add last 2 scenes from history if available
    if (history && history.length > 0) {
      const recent = history.slice(-4);
      recent.forEach(h => {
        msgs.push({
          role: h.role === 'player' ? 'user' : 'assistant',
          content: typeof h.content === 'string' ? h.content : JSON.stringify(h.content)
        });
      });
    }

    // Add current request
    msgs.push({
      role: 'user',
      content: JSON.stringify({
        sceneNumber: sceneNum + 1,
        totalScenes: 3,
        playerCurrentStats: player.stats,
        playerLevel: player.level,
        dungeonContext: `${dungeon.name} - 場景 ${sceneNum + 1}/3`,
      })
    });

    return msgs;
  },

  /**
   * Validate AI output structure
   */
  _validateScene(content, dungeon) {
    // Ensure valid structure
    if (!content || !content.choices || !Array.isArray(content.choices) || content.choices.length !== 4) {
      throw new Error('Invalid AI scene format');
    }

    // Ensure one safe choice
    const hasSafe = content.choices.some(c => !c.stat);
    if (!hasSafe) {
      content.choices[3] = {
        id: 4,
        text: '保持警覺，觀察周圍的變化',
        stat: null,
        dc: null,
        type: 'story'
      };
    }

    // Ensure valid stats
    const validStats = ['insight', 'survival', 'combat', 'puzzle', 'luck'];
    content.choices.forEach(c => {
      if (c.stat && !validStats.includes(c.stat)) {
        c.stat = 'luck';
        c.dc = c.dc || 8;
      }
    });

    // Ensure uniqueness of IDs
    content.choices.forEach((c, i) => { c.id = i + 1; });

    return {
      narrative: content.narrative || '你進入了未知的區域...',
      choices: content.choices,
    };
  },

  /**
   * Demo outcome (no AI)
   */
  _demoOutcome(dungeon, sceneNum, choice, player) {
    return DemoScenes.processChoice(dungeon, sceneNum, choice.id, player);
  },

  /**
   * Save API key
   */
  setApiKey(key) {
    this.apiKey = key;
    localStorage.setItem('aigm_key', key);
  },

  /**
   * Load saved API key
   */
  loadApiKey() {
    this.apiKey = localStorage.getItem('aigm_key') || '';
    const savedModel = localStorage.getItem('aigm_model');
    if (savedModel) this.settings.model = savedModel;
    return this.apiKey;
  },

  /**
   * Get available models from OpenRouter
   */
  async getAvailableModels() {
    if (!this.apiKey) return [];
    try {
      const res = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    } catch(e) {
      return [];
    }
  }
};

// Auto-load saved key
AIGM.loadApiKey();

/**
 * Generate a complete dungeon tree (all branches, encounters, drops)
 */
AIGM.generateDungeonTree = async function(world, player, seed) {
  if (!this.apiKey) return null;

  const systemPrompt = `你是一個「無限流模擬器」的 AI GM，負責設計完整的副本結構。

【世界觀】
- 玩家被選中進入無限流世界，必須穿越不同副本
- 每個副本是一個獨立世界，有自己的規則和故事
- 副本有 F(最簡單) 到 A(極難) 的分級
- 每個副本有三種結局：BE(壞), HE(正常通關), TE(完美)

【當前副本】
名稱：${world.name}
難度：${world.tier}級（${world.type}）
描述：${world.description}

【玩家資訊】
等級：Lv.${player.level}
屬性：洞察 ${player.stats.insight}, 生存 ${player.stats.survival}, 戰鬥 ${player.stats.combat}, 解謎 ${player.stats.puzzle}, 運氣 ${player.stats.luck}

【設計要求——至關重要】
1. 生成一個完整的副本分支樹，包含以下部分：
   a. background: 3-5句場景背景描述
   b. branches: 包含至少 6 個分支節點（start + 4個中間節點 + 3個結局節點）
   c. endings: 3種結局定義

2. 每個分支節點包含：
   - id: 唯一標識
   - title: 節點名稱
   - description: 2-3句場景描述（繁體中文）
   - choices: 2-3個選項（最後的分支可只有1個）

3. 每個選項包含：
   - id: 唯一標識
   - text: 選項文字（繁體中文）
   - requires: stat需求（其中一個為 null 安全選項），stat只可以是 insight/survival/combat/puzzle/luck
   - leadsTo: 下一個分支 ID
   - encounter: 包含 type, difficulty(easy/medium/hard), winRate(0-1，按玩家屬性調整), xpReward(15-50), itemPool(2-4個道具ID), itemDropChance(0.1-0.5)

4. 道具 ID 從以下選擇：iron_sword, cloth_armor, herb, old_key, bone_charm, steel_sword, leather_armor, torch, moon_pendant, silver_dagger, void_blade, enigma_ring, phantom_cloak, ancient_compass, soul_reaper, time_hourglass, star_fragment, book_of_fate, eternal_dawn
   更難的區域用更高稀有度的道具。

5. 結局節點 id 必須是 end_be / end_he / end_te 其中之一。

6. 輸出必須是純 JSON，不要任何 markdown 或註釋。

【輸出格式】
{
  "instanceId": "ai_${seed}_${Date.now()}",
  "worldId": "${world.id}",
  "worldName": "${world.name}",
  "worldTier": "${world.tier}",
  "seed": ${seed},
  "background": "背景描述...",
  "branches": {
    "start": { "id": "start", "title": "...", "description": "...", "choices": [...] },
    "branch_1": { "id": "branch_1", "title": "...", "description": "...", "choices": [...] },
    "end_be": { "id": "end_be", "title": "💀 結局", "description": "...", "choices": [], "isEnd": true },
    "end_he": { "id": "end_he", "title": "✅ 結局", "description": "...", "choices": [], "isEnd": true },
    "end_te": { "id": "end_te", "title": "✦ 結局", "description": "...", "choices": [], "isEnd": true }
  },
  "endings": [
    { "type": "TE", "label": "✦ True End", "condition": "...", "pathPattern": "...", "xpBonus": 300 },
    { "type": "HE", "label": "✅ Normal End", "condition": "...", "pathPattern": "...", "xpBonus": 150 },
    { "type": "BE", "label": "💀 Bad End", "condition": "...", "pathPattern": "...", "xpBonus": 30 }
  ],
  "currentBranch": "start",
  "pathTaken": [],
  "completed": false,
  "finalEnding": null,
  "generatedAt": "${new Date().toISOString()}"
}`;

  try {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://dancingturtle.github.io',
        'X-Title': 'DancingTurtle 無限流模擬器',
      },
      body: JSON.stringify({
        model: this.settings.model,
        messages: [{ role: 'system', content: systemPrompt }],
        temperature: 0.85,
        max_tokens: 3000,
        response_format: { type: 'json_object' },
      })
    });

    if (!response.ok) throw new Error(`API ${response.status}`);

    const data = await response.json();
    const tree = JSON.parse(data.choices[0].message.content);

    // Validate and fix structure
    if (!tree.branches || !tree.endings) throw new Error('Invalid tree structure');

    // Ensure end nodes exist
    for (const e of ['end_be', 'end_he', 'end_te']) {
      if (!tree.branches[e]) {
        tree.branches[e] = { id: e, title: '結局', description: '你的旅程在此結束。', choices: [], isEnd: true };
      }
    }

    // Ensure start node exists
    if (!tree.branches['start']) throw new Error('Missing start node');

    // Ensure 1 safe choice per branch
    for (const branch of Object.values(tree.branches)) {
      if (branch.choices && branch.choices.length > 0) {
        const hasSafe = branch.choices.some(c => !c.requires);
        if (!hasSafe) {
          branch.choices[branch.choices.length - 1].requires = null;
        }
      }
    }

    tree.playerStatsAtEntry = { ...player.stats };
    tree.playerLevel = player.level;
    tree.currentBranch = 'start';
    tree.pathTaken = [];

    return tree;
  } catch (e) {
    console.warn('AI generateDungeonTree failed:', e.message);
    return null;
  }
};
