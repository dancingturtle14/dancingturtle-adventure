/* ============================================
   無限流模擬器 — 冒險 UI（AI 生成副本版）
   ============================================ */

const GameUI = {
  init() {
    Game.init();

    // Check for unfinished run
    const resumed = Game.resumeRun();
    if (resumed) {
      this.resumeAdventure(resumed);
    } else {
      this.renderWorldList();
    }

    this.updateHUD();
  },

  updateHUD() {
    const stamina = Game.getStaminaDisplay();
    setText('stamina-val', Math.floor(stamina.current));
    setText('daily-val', stamina.dailyLeft);
    setText('currency-val', Game.player.currency);
    setText('avatar-display', Game.player.avatar);
    setText('mobile-avatar', Game.player.avatar);
    setText('mobile-name', `${Game.player.username} · Lv.`);
    setText('mobile-level', Game.player.level);
    setText('mobile-exp', `EXP: ${Game.player.exp}`);
    setText('mobile-stamina', Math.floor(stamina.current));
  },

  // ======== 世界選擇（含歷史記錄）=======
  renderWorldList() {
    const container = document.getElementById('dungeon-list');
    if (!container) return;

    show('dungeon-select');
    hide('adventure-area');
    hide('loading-area');
    hide('world-history');

    const available = Game.getAvailableWorlds();
    const stamina = Game.getStaminaDisplay();
    const allHistory = Game.getAllWorldHistory();

    container.innerHTML = available.map(w => {
      const isLocked = Game.player.level < w.minLevel || !stamina.canRun;
      const history = allHistory[w.id];
      const totalRuns = history?.totalRuns || 0;
      const bestEnding = history?.bestEnding || null;
      const bestEmoji = { TE: '⭐', HE: '✅', BE: '💀' };

      return `
        <div class="dungeon-card ${isLocked ? 'locked' : ''}" data-world="${w.id}">
          <div class="dungeon-card-header">
            <span class="dungeon-tier" style="background:${w.color}">${w.tier}</span>
            <span class="dungeon-name">${w.name}</span>
            <span class="dungeon-type">${w.type}</span>
          </div>
          <div class="dungeon-desc">${w.description}</div>
          <div class="dungeon-history">
            ${totalRuns > 0 ? `<span class="history-badge">🕐 ${totalRuns}次 ${bestEmoji[bestEnding]||''}</span>` : '<span class="history-badge new">🆕 未探索</span>'}
          </div>
          <div class="dungeon-footer">
            <span class="dungeon-req">🔒 Lv.${w.minLevel}+</span>
            ${isLocked
              ? `<span class="dungeon-locked-msg">${Game.player.level < w.minLevel ? '等級不足' : '體力不足'}</span>`
              : `<button class="btn btn-primary dungeon-enter-btn" onclick="GameUI.showWorldHistory('${w.id}')">✦ 進入</button>`
            }
          </div>
        </div>
      `;
    }).join('');
  },

  showWorldHistory(worldId) {
    const world = WORLDS.find(w => w.id === worldId);
    if (!world) return;

    const history = Game.getWorldHistory(worldId);
    const container = document.getElementById('world-history');
    if (!container) return;

    show('world-history');
    const endingEmoji = { TE: '✦', HE: '✅', BE: '💀' };
    const endingColor = { TE: 'var(--gold)', HE: 'var(--secondary)', BE: 'var(--danger)' };

    container.innerHTML = `
      <div class="world-history-panel">
        <div class="wh-header">
          <div class="wh-title">
            <span style="font-size:24px">🌍</span>
            <div>
              <h2>${world.name}</h2>
              <span class="dungeon-tier" style="background:${world.color}">${world.tier}</span>
              <span class="dungeon-type">${world.type}</span>
            </div>
          </div>
          <div class="wh-stats">
            <div class="wh-stat"><strong>${history.totalRuns}</strong> 次進入</div>
            <div class="wh-stat"><strong>${history.bestEnding ? endingEmoji[history.bestEnding] : '—'}</strong> 最佳</div>
          </div>
        </div>

        ${history.recentEntries.length > 0 ? `
          <div class="wh-entries">
            <h3 style="font-size:14px;margin-bottom:8px">📜 冒險記錄</h3>
            ${history.recentEntries.map(e => `
              <div class="wh-entry">
                <span style="color:${endingColor[e.ending]};font-weight:700">${endingEmoji[e.ending]}</span>
                <span style="flex:1">${e.items.length > 0 ? `獲得 ${e.items.join(', ')}` : '未獲得物品'}</span>
                <span style="font-size:11px;color:var(--text-muted)">${new Date(e.date).toLocaleDateString('zh-HK')}</span>
              </div>
            `).join('')}
          </div>
        ` : `<div class="wh-empty">🆕 從未進入過這個世界。準備好迎接未知了嗎？</div>`}

        <div class="wh-actions">
          <button class="btn btn-secondary" onclick="GameUI.renderWorldList()">← 返回</button>
          <button class="btn btn-primary" onclick="GameUI.startDungeon('${worldId}')">✦ 進入【${world.name}】</button>
        </div>
      </div>
    `;
  },

  // ======== AI 生成副本 + 進入 ========
  async startDungeon(worldId) {
    hide('world-history');
    show('loading-area');

    const loadingEl = document.getElementById('loading-area');
    if (loadingEl) {
      loadingEl.innerHTML = `
        <div class="loading-spinner">🌀</div>
        <div class="loading-text">AI 正在生成副本世界...</div>
        <div class="loading-sub">根據你的屬性設計路線、敵人和掉落物品</div>
      `;
    }

    // Give UI time to render before blocking
    await new Promise(r => setTimeout(r, 100));

    const dungeon = await Game.startRun(worldId);
    if (!dungeon) {
      loadingEl.innerHTML = `<div class="loading-text" style="color:var(--danger)">❌ 體力不足或發生錯誤</div>`;
      setTimeout(() => this.renderWorldList(), 1500);
      return;
    }

    hide('loading-area');
    this.enterDungeon(dungeon);
  },

  enterDungeon(dungeon) {
    hide('dungeon-select');
    show('adventure-area');

    setText('scene-dungeon-name', `${dungeon.worldTier}級 · ${dungeon.worldName}`);
    this.showBranch(dungeon.currentBranch);
  },

  resumeAdventure(dungeon) {
    hide('dungeon-select');
    show('adventure-area');

    setText('scene-dungeon-name', `${dungeon.worldTier}級 · ${dungeon.worldName}（未完成）`);
    this.showBranch(dungeon.currentBranch);
  },

  // ======== 顯示分支 ========
  showBranch(branchId) {
    if (!Game.currentDungeon) return;

    // If we got a string, look up the branch
    const branch = typeof branchId === 'string'
      ? Game.currentDungeon.branches[branchId]
      : branchId;

    if (!branch) return;

    Game.currentBranch = branch;
    hide('scene-result');
    hide('choices-container');

    // Show narrative
    const narrativeEl = document.getElementById('scene-narrative');
    if (narrativeEl) {
      narrativeEl.innerHTML = `
        <div class="branch-title">${branch.title}</div>
        <div class="narrative-text">${this._formatText(branch.description)}</div>
      `;
    }

    // Show choices if not end
    if (!branch.isEnd && branch.choices?.length > 0) {
      show('choices-container');
      const choicesEl = document.getElementById('choices-container');
      const keys = ['A', 'B', 'C'];

      choicesEl.innerHTML = branch.choices.map((c, i) => {
        const statTag = c.requires
          ? `<span class="choice-stat">[${STAT_LABELS[c.requires.stat] || c.requires.stat} ${c.requires.dc}]</span>`
          : `<span class="choice-stat safe">[安全]</span>`;

        const statOk = !c.requires || (Game.player.stats[c.requires.stat] || 0) >= c.requires.dc;
        const enc = c.encounter || {};
        const diffTag = enc.difficulty !== 'none' && enc.difficulty
          ? `<span class="choice-diff ${enc.difficulty}">${enc.difficulty === 'easy' ? '簡單' : enc.difficulty === 'medium' ? '中等' : '困難'}</span>`
          : '';

        return `
          <button class="choice-btn ${statOk ? 'active' : 'locked'}" ${!statOk ? 'disabled' : ''}
                  onclick="GameUI.makeChoice('${c.id}')">
            <span class="choice-key">${keys[i] || (i+1)}</span>
            ${statTag}
            ${diffTag}
            <span class="choice-text">${c.text}</span>
          </button>
        `;
      }).join('');
    }

    // If end node, show ending
    if (branch.isEnd) {
      this.showEnding();
    }

    this.updateHUD();
  },

  makeChoice(choiceId) {
    const result = Game.makeChoice(choiceId);
    if (!result) return;

    hide('choices-container');
    show('scene-result');

    const { result: outcome, nextBranch, isEnd, choice } = result;

    // Show encounter result
    const resultEl = document.getElementById('result-text');
    if (resultEl) {
      const enc = choice.encounter || {};
      const outcomeDesc = outcome.success
        ? this._randomSuccessText(enc.type)
        : this._randomFailText(enc.type);

      resultEl.innerHTML = `
        <div class="encounter-result ${outcome.success ? 'success' : 'fail'}">
          ${outcome.success ? '✅ 成功' : '❌ 失敗'}
          ${choice.requires ? `<span class="roll-detail">🎲 骰子判定</span>` : ''}
        </div>
        <div class="outcome-text">${outcomeDesc}</div>
        <div class="xp-gain">✨ +${outcome.xpGained} EXP</div>
        ${outcome.item ? `
          <div class="item-drop-card" style="border-color:${RARITY_TIERS[outcome.item.rarity]?.border || '#999'}">
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:24px">${outcome.item.icon}</span>
              <div>
                <div style="font-weight:700;color:${RARITY_TIERS[outcome.item.rarity]?.color}">
                  🎁 獲得 [${RARITY_TIERS[outcome.item.rarity]?.label}] ${outcome.item.name}
                </div>
                <div style="font-size:12px;color:var(--text-muted)">${outcome.item.flavor}</div>
              </div>
            </div>
          </div>
        ` : ''}
      `;
    }

    // Update continue button
    const continueBtn = document.getElementById('continue-btn');
    if (continueBtn) {
      if (isEnd) {
        continueBtn.textContent = '✦ 查看結局';
      } else {
        continueBtn.textContent = '➤ 繼續冒險';
      }
    }

    this.updateHUD();
  },

  nextScene() {
    if (!Game.currentBranch) return;

    if (Game.currentBranch.isEnd) {
      this.finishRun();
    } else {
      hide('scene-result');

      // Navigate to the next branch
      const lastChoiceId = Game.currentDungeon.pathTaken[Game.currentDungeon.pathTaken.length - 1];
      const currentBranch = Game.currentDungeon.branches[Game.currentDungeon.currentBranch];

      if (currentBranch) {
        this.showBranch(currentBranch);
      } else {
        this.finishRun();
      }
    }
  },

  showEnding() {
    hide('choices-container');
    show('scene-result');

    const dungeon = Game.currentDungeon;
    const ending = dungeon.finalEnding
      ? Game.currentDungeon.endings.find(e => e.type === dungeon.finalEnding)
      : null;

    const resultEl = document.getElementById('result-text');
    if (resultEl) {
      const endingColors = { TE: 'var(--gold)', HE: 'var(--secondary)', BE: 'var(--danger)' };
      const endingBg = {
        TE: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,152,0,0.1))',
        HE: 'linear-gradient(135deg, rgba(0,184,148,0.1), rgba(85,239,196,0.1))',
        BE: 'linear-gradient(135deg, rgba(255,107,107,0.1), rgba(225,112,85,0.1))'
      };
      const endingIcons = { TE: '✦', HE: '✅', BE: '💀' };

      resultEl.innerHTML = `
        <div class="ending-display" style="border-color:${endingColors[ending?.type] || '#999'};background:${endingBg[ending?.type] || 'white'}">
          <div class="ending-icon" style="color:${endingColors[ending?.type] || '#999'}">
            ${endingIcons[ending?.type] || '?'}
          </div>
          <div class="ending-label" style="color:${endingColors[ending?.type] || '#999'}">
            ${ending?.label || '冒險結束'}
          </div>
          <div class="ending-condition">${ending?.condition || ''}</div>
          <div class="ending-xp">✨ +${ending?.xpBonus || 0} EXP（結局獎勵）</div>
        </div>
      `;
    }

    const continueBtn = document.getElementById('continue-btn');
    if (continueBtn) {
      continueBtn.textContent = '✦ 返回大廳';
    }
  },

  finishRun() {
    Storage.clearDungeon();
    Game.currentDungeon = null;
    Game.currentBranch = null;
    this.renderWorldList();
    this.updateHUD();
  },

  // ======== 文字 helper ========
  _formatText(text) {
    return (text || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
  },

  _randomSuccessText(type) {
    const texts = {
      exploration: ['你仔細觀察，發現了隱藏的線索！這條路是正確的。', '你的洞察力讓你避開了危險，找到了前進的方向。'],
      puzzle: ['你成功解開了謎題！機關發出咔嚓聲，前方的大門打開了。', '你的推理能力讓一切變得清晰。'],
      combat: ['你展現了出色的戰鬥技巧！成功擊退了威脅。', '雖然戰鬥激烈，但你成功脫身了。'],
      gambling: ['你的直覺是對的！這次冒險獲得了回報。', '運氣站在你這邊！'],
      story: ['你的選擇帶來了意想不到的收穫。'],
    };
    const pool = texts[type] || texts.story;
    return pool[Math.floor(Math.random() * pool.length)];
  },

  _randomFailText(type) {
    const texts = {
      exploration: ['周圍的環境太過隱晦。你錯過了關鍵的線索。', '你什麼也沒發現。'],
      puzzle: ['這個謎題超出了你的理解範圍。', '你的推理走進了死胡同。'],
      combat: ['你的攻擊被化解了！你被迫後退。', '戰鬥對你來說太過艱難。'],
      gambling: ['這次運氣不好。冒險的行動帶來了一些麻煩。', '運氣不是永遠可靠的。'],
      story: ['這個選擇沒有帶來預期的效果。'],
    };
    const pool = texts[type] || texts.story;
    return pool[Math.floor(Math.random() * pool.length)];
  }
};

// ======== Init ========
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => GameUI.init());
} else {
  GameUI.init();
}
