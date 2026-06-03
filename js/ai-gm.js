/* ============================================
   無限流模擬器 — AI GM 模組 v2
   即時場景生成 · 動態敘事 · 場景進度控制
   ============================================ */

const AIGM = {
  apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
  apiKey: '',
  defaultModel: 'openrouter/anthropic/claude-3.5-sonnet',

  settings: {
    model: localStorage.getItem('aigm_model') || 'openrouter/anthropic/claude-3.5-sonnet',
    temperature: 0.8,
    maxTokens: 1500,
  },

  loadApiKey() {
    this.apiKey = localStorage.getItem('aigm_key') || '';
    const savedModel = localStorage.getItem('aigm_model');
    if (savedModel) this.settings.model = savedModel;
    return this.apiKey;
  },

  setApiKey(key) {
    this.apiKey = key;
    localStorage.setItem('aigm_key', key);
  },

  /**
   * Generate the opening scene for a new dungeon run.
   */
  async generateOpening(world, player, worldContext) {
    const systemPrompt = this._buildOpeningPrompt(world, player, worldContext);
    return await this._callAI(systemPrompt, [], 0.85, 1500);
  },

  /**
   * Generate the next scene after a player makes a choice.
   */
  async generateNextScene(context) {
    const { dungeon, currentScene, player, choice, checkResult, sceneHistory, sceneNumber } = context;

    // Find the world theme for thematic prompt
    const world = WORLD_THEMES.find(w => w.id === dungeon.worldId) || { name: dungeon.worldName, thematic: 'fantasy adventure' };

    const systemPrompt = this._buildScenePrompt(dungeon, world, player, sceneNumber);
    const messages = this._buildSceneMessages(currentScene, choice, checkResult, sceneHistory, sceneNumber);
    return await this._callAI(systemPrompt, messages, 0.8, 1500);
  },

  /**
   * Force an ending scene (when hard cap is reached).
   */
  async forceEnding(worldTheme, player, currentRun) {
    const world = worldTheme;
    const sceneCount = currentRun?.sceneCount || currentRun?.scenes?.length || 0;
    const stats = player.stats;
    const items = (player.items || []).slice(-5).map(i => i.name).join('、') || '無';

    const prompt = `你是一個「無限流模擬器」的 AI GM。

【重要】因為副本已達到最大場景數上限，你必須立即生成一個結局場景。

【當前世界】${world.name}（${world.theme || world.thematic}）
【玩家】Lv.${player.level}，${player.username}
【故事摘要】冒險者在 ${world.name} 經歷了 ${sceneCount} 個場景的冒險，獲得了 ${currentRun?.xpTotal || 0} 經驗。

請根據目前的冒歷脈絡，生成一個合適的結局場景。結局可以是：
- TE（完美結局）：${player.username} 揭示了這個世界的核心秘密
- HE（普通結局）：${player.username} 成功存活並離開
- BE（壞結局）：${player.username} 未能達到目的

【輸出格式 — 必須嚴格遵守 JSON】
{
  "narrative": "結局敘述...（3-5句）",
  "ending_type": "TE" | "HE" | "BE",
  "ending_proximity": 100,
  "scene_type": "ending",
  "isEnd": true,
  "xpGained": 0,
  "itemDrop": null,
  "story_summary": "一句話總結這次冒險的關鍵事件"
}`;

    return await this._callAI(prompt, [], 0.7, 800);
  },

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
  },

  // ======== Private: Build Prompts ========

  _buildOpeningPrompt(world, player, worldContext) {
    const stats = player.stats || {};
    const items = (player.items || []).slice(-5).map(i => `${i.icon}${i.name}`).join('、') || '無';

    return `你是一個「無限流模擬器」的 AI GM。你的任務是為玩家生成一次獨一無二的副本冒險。

【世界觀設定】
- 玩家被選中進入「無限流世界」，必須穿越不同的主題世界
- 每個主題世界有自己的規則和故事，但每次進入的內容都不同
- 副本有 F(最簡單) 到 S(極難) 的分級
- 每次副本有三種結局可能：BE(壞結局)、HE(普通通關)、TE(True End 完美結局)
- 遊戲是回合制的：你生成場景→玩家選擇→你生成結果→重複

【當前世界主題】
世界名稱：${world.name}
難度等級：${world.tier}級
世界描述：${world.description}
主題元素：${world.thematic}

【玩家資訊】
名稱：${player.username}
等級：Lv.${player.level}
屬性：洞察 ${stats.insight || 5}、生存 ${stats.survival || 5}、戰鬥 ${stats.combat || 5}、解謎 ${stats.puzzle || 5}、運氣 ${stats.luck || 5}
持有物品：${items}

【世界歷史】
${worldContext}

【場景生成規則 — 至關重要】
1. 生成開場場景敘述（3-5句繁體中文），描述玩家如何進入這個世界、當前處境
2. 生成 4 個選項（A/B/C/D），選項必須多樣化
3. 選項類型必須包含多種：combat/exploration/puzzle/story/gambling
4. 其中 1 個選項是「安全選項」（stat=null, dc=null, type=story）
5. 其他 3 個選項綁定 stat + DC，DC 值參考玩家屬性（比屬性值高 2-8）
6. **Stat 只能是：insight, survival, combat, puzzle, luck 之一**
7. **Type 只能是：exploration, combat, puzzle, story, gambling 之一**

【場景進度規則 — 非常重要】
1. scene_type 必須是 "opening"（開場場景）
2. ending_proximity 設為 0-10（剛開始）
3. 不要急著導向結局，讓故事自然發展

【輸出格式 — 必須嚴格遵守 JSON】
{
  "narrative": "場景敘述...（3-5句繁體中文，富有沉浸感）",
  "choices": [
    { "id": 1, "text": "行動描述", "stat": "insight", "dc": 10, "type": "exploration", "leadsTo": null },
    { "id": 2, "text": "行動描述", "stat": null, "dc": null, "type": "story", "leadsTo": null },
    { "id": 3, "text": "行動描述", "stat": "combat", "dc": 12, "type": "combat", "leadsTo": null },
    { "id": 4, "text": "行動描述", "stat": "luck", "dc": 8, "type": "gambling", "leadsTo": null }
  ],
  "scene_type": "opening",
  "ending_proximity": 5,
  "isEnd": false
}`;
  },

  _buildScenePrompt(dungeon, world, player, sceneNumber) {
    const stats = player.stats || {};
    const items = (player.items || []).slice(-5).map(i => `${i.icon || ''}${i.name}[${i.rarity}]`).join('、') || '無';

    return `你是一個「無限流模擬器」的 AI GM。你正在為玩家生成冒險的後續場景。

【當前世界】${world.name}（${world.thematic}）
【場景進度】第 ${sceneNumber} 個場景

【玩家資訊】
名稱：${player.username}
等級：Lv.${player.level}
屬性：洞察 ${stats.insight || 5}、生存 ${stats.survival || 5}、戰鬥 ${stats.combat || 5}、解謎 ${stats.puzzle || 5}、運氣 ${stats.luck || 5}
持有物品：${items}

【場景生成規則 — 至關重要】
1. 根據玩家之前的選擇，生成合理的後續場景敘述（3-5句繁體中文）
2. 生成 4 個選項（A/B/C/D），每個選項必須不同
3. 選項類型必須多樣：至少包含 exploration/combat/puzzle/story/gambling 中的 4 種
4. 其中 1 個選項為「安全選項」（stat=null, dc=null, type=story）
5. 其他 3 個選項綁定 stat + DC，DC 值參考玩家屬性（比屬性值高 2-8）
6. 選項的 DC 要合理：太高玩家 fail 太多沒趣，太低沒挑戰性

【場景進度規則 — 非常重要】
1. scene_type 控制場景階段：
   - 場景 1-3：scene_type = "opening"（發展世界觀和處境）
   - 場景 4-7：scene_type = "development"（推進劇情，遇到關鍵事件）
   - 場景 8-11：scene_type = "climax"（高潮，ending_proximity 60-85）
   - 場景 12+：scene_type = "ending"（ending_proximity > 85，必須導向結局）
2. ending_proximity（0-100）控制距離結局有多近
   - 初期（場景1-3）：5-20
   - 中期（場景4-7）：20-50
   - 後期（場景8-11）：50-85
   - 末期（場景12+）：85-100
3. 當 ending_proximity >= 85，choices 中必須有一個 choice 的 leadsTo 設為 "ending"
4. 自然的副本長度約為 7-12 個場景

【掉落與經驗規則】
1. xpGained：根據這個場景的難度和玩家的表現，給予 10-50 經驗
2. itemDrop：可以為 null（不掉落）或一個 ITEM_TEMPLATES 中的 templateId（如 "iron_sword"）
   - 掉落機率約 25-40%，根據場景難度調整
   - 不要每次都有掉落，否則物品不值錢
   - 掉落的物品應該與場景主題相關
3. 稀有度由系統自動決定，你只需指定 templateId

【輸出格式 — 必須嚴格遵守 JSON】
{
  "narrative": "場景敘述...（3-5句繁體中文，沉浸感強）",
  "choices": [
    { "id": 1, "text": "行動描述", "stat": "insight", "dc": 10, "type": "exploration", "leadsTo": null },
    { "id": 2, "text": "行動描述", "stat": null, "dc": null, "type": "story", "leadsTo": null },
    { "id": 3, "text": "行動描述", "stat": "combat", "dc": 12, "type": "combat", "leadsTo": null },
    { "id": 4, "text": "行動描述", "stat": "luck", "dc": 8, "type": "gambling", "leadsTo": null }
  ],
  "scene_type": "development",
  "ending_proximity": 35,
  "isEnd": false,
  "xpGained": 25,
  "itemDrop": null,
  "story_summary": "一句話摘要這個場景的關鍵事件"
}`;
  },

  _buildSceneMessages(currentScene, choice, checkResult, sceneHistory, sceneNumber) {
    const messages = [];

    // Add recent scene history for context
    if (sceneHistory && sceneHistory.length > 0) {
      for (const h of sceneHistory.slice(-3)) {
        if (h.scene?.narrative) {
          messages.push({ role: 'assistant', content: h.scene.narrative });
        }
        if (h.choiceMade?.text) {
          messages.push({ role: 'user', content: `玩家選擇了：${h.choiceMade.text}` });
        }
      }
    }

    // Add current context
    let context = `【當前場景】${currentScene.narrative}\n`;
    context += `【玩家選擇】${choice.text}（ID: ${choice.id}）\n`;
    if (choice.stat && checkResult) {
      context += `【判定結果】d20=${checkResult.roll} + ${choice.stat}(${checkResult.bonus}) = ${checkResult.total} vs DC=${checkResult.dc} ⇒ ${checkResult.success ? '✅ 成功' : '❌ 失敗'}`;
      if (checkResult.natural20) context += ' （自然20！）';
      if (checkResult.natural1) context += ' （自然1⋯⋯）';
    }
    context += `\n\n請根據玩家這個選擇和判定結果，生成下一個場景（第 ${sceneNumber} 個場景）。`;

    messages.push({ role: 'user', content: context });
    return messages;
  },

  // ======== Private: AI API Call ========
  async _callAI(systemPrompt, messages, temperature, maxTokens) {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://dancingturtle14.github.io',
          'X-Title': 'DancingTurtle 無限流模擬器',
        },
        body: JSON.stringify({
          model: this.settings.model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
          ],
          temperature: temperature,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' },
        })
      });

      if (!response.ok) {
        throw new Error(`API ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      const content = JSON.parse(data.choices[0].message.content);

      // Validate and fix structure
      return this._validateScene(content);

    } catch (e) {
      console.error('AI GM call failed:', e.message);
      return null;
    }
  },

  _validateScene(content) {
    if (!content || !content.narrative || !content.choices) return null;

    // Ensure 4 choices
    if (!Array.isArray(content.choices) || content.choices.length === 0) return null;

    // Ensure at least one safe choice
    const hasSafe = content.choices.some(c => !c.stat);
    if (!hasSafe && content.choices.length > 0) {
      content.choices[content.choices.length - 1].stat = null;
      content.choices[content.choices.length - 1].dc = null;
      content.choices[content.choices.length - 1].type = 'story';
    }

    // Fix choice IDs
    content.choices.forEach((c, i) => {
      c.id = i + 1;
      if (c.leadsTo === undefined) c.leadsTo = null;
    });

    // Ensure valid stats
    const validStats = ['insight', 'survival', 'combat', 'puzzle', 'luck'];
    content.choices.forEach(c => {
      if (c.stat && !validStats.includes(c.stat)) {
        c.stat = 'luck';
        c.dc = c.dc || 8;
      }
    });

    // Default values
    content.scene_type = content.scene_type || 'development';
    content.ending_proximity = content.ending_proximity || 30;
    content.isEnd = content.isEnd || false;
    content.xpGained = content.xpGained || 15;
    content.itemDrop = content.itemDrop || null;
    content.story_summary = content.story_summary || '';

    return content;
  }
};

// Auto-load saved key
AIGM.loadApiKey();
