/* ============================================
   無限流模擬器 — 冒險 UI（進入輪迴版）
   ============================================ */

const GameUI = {
  init() {
    Game.init();

    // Check for unfinished run
    const resumed = Game.resumeRun();
    if (resumed) {
      this.resumeAdventure(resumed);
    }

    this.updateDisplay();
  },

  updateDisplay() {
    const stamina = Game.getStaminaDisplay();
    setText('stamina-display', Math.floor(stamina.current));
    setText('daily-display', stamina.dailyLeft);
    setText('currency-display', Game.player.currency);
    setText('statpoints-display', Game.player.statPoints);
    setText('avatar-display', Game.player.avatar);
    setText('mobile-avatar', Game.player.avatar);
    setText('mobile-name', `${Game.player.username} · Lv.`);
    setText('mobile-level', Game.player.level);
    setText('mobile-exp', `EXP: ${Game.player.exp}`);
    setText('mobile-stamina', Math.floor(stamina.current));

    // Update button state
    const btn = document.getElementById('reincarnation-btn');
    if (btn) {
      btn.disabled = !stamina.canRun;
      btn.style.opacity = stamina.canRun ? '1' : '0.5';
    }

    // Show recent history
    this.showRecentHistory();
  },

  showRecentHistory() {
    const container = document.getElementById('reincarnation-history');
    if (!container) return;

    const allHistory = Game.getAllWorldHistory();
    const recent = [];

    for (const [worldId, data] of Object.entries(allHistory)) {
      if (data.entries && data.entries.length > 0) {
        const latest = data.entries[0];
        const world = WORLDS.find(w => w.id === worldId);
        recent.push({ worldId, worldName: world?.name || worldId, ...latest });
      }
    }

    recent.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (recent.length === 0) {
      container.innerHTML = `<div class="rh-empty">尚未進入過輪迴。準備好迎接未知了嗎？</div>`;
      return;
    }

    const colors = { TE: 'var(--gold)', HE: 'var(--secondary)', BE: 'var(--danger)' };
    const icons = { TE: '✦', HE: '✅', BE: '💀' };

    container.innerHTML = `
      <div class="rh-title">📜 最近輪迴</div>
      ${recent.slice(0, 5).map(r => `
        <div class="rh-entry">
          <span class="rh-ending" style="color:${colors[r.ending]}">${icons[r.ending]}</span>
          <span class="rh-world">${r.worldName}</span>
          <span class="rh-xp">✨+${r.xpGained} EXP</span>
          ${r.items?.length ? `<span class="rh-items">${r.items.join(', ')}</span>` : ''}
          <span class="rh-date">${new Date(r.date).toLocaleDateString('zh-HK')}</span>
        </div>
      `).join('')}
    `;
  },

  // ======== 進入輪迴 ========
  async enterReincarnation() {
    const stamina = Game.getStaminaDisplay();
    if (!stamina.canRun) {
      alert('體力不足或今日次數已用完！');
      return;
    }

    // AI picks a world
    const world = Game.pickWorldForPlayer();
    if (!world) {
      alert('沒有可進入的世界！');
      return;
    }

    hide('dungeon-select');
    show('loading-area');

    const loadingEl = document.getElementById('loading-area');
    if (loadingEl) {
      loadingEl.innerHTML = `
        <div class="loading-spinner">🌀</div>
        <div class="loading-text">AI 正在為你構建輪迴...</div>
        <div class="loading-sub">根據你的數據、裝備和經歷建構獨一無二的冒險</div>
        <div class="loading-world">🌍 ${world.tier}級 · ${world.name}</div>
      `;
    }

    // Let UI render before blocking
    await new Promise(r => setTimeout(r, 100));

    // Generate dungeon (this includes stamina spend)
    const dungeon = await Game.startRun(world.id);
    if (!dungeon) {
      loadingEl.innerHTML = `<div class="loading-text" style="color:var(--danger)">❌ 輪迴失敗</div>`;
      setTimeout(() => { hide('loading-area'); show('dungeon-select'); this.updateDisplay(); }, 1500);
      return;
    }

    hide('loading-area');
    this.enterDungeon(dungeon);
  },

  enterDungeon(dungeon) {
    show('adventure-area');
    const world = WORLDS.find(w => w.id === dungeon.worldId);
    setText('scene-dungeon-name', `${dungeon.worldTier}級 · ${dungeon.worldName}`);
    this.showBranch(dungeon.currentBranch);
  },

  resumeAdventure(dungeon) {
    show('adventure-area');
    setText('scene-dungeon-name', `${dungeon.worldTier}級 · ${dungeon.worldName}（未完成）`);
    this.showBranch(dungeon.currentBranch);
  },

  // ======== 顯示分支 ========
  showBranch(branchInput) {
    if (!Game.currentDungeon) return;

    const branch = typeof branchInput === 'string'
      ? Game.currentDungeon.branches[branchInput]
      : branchInput;

    if (!branch) return;

    Game.currentBranch = branch;
    hide('scene-result');

    // Narrative
    const narrativeEl = document.getElementById('scene-narrative');
    if (narrativeEl) {
      narrativeEl.innerHTML = `
        <div class="branch-title">${branch.title}</div>
        <div class="narrative-text">${this._fmt(branch.description)}</div>
      `;
    }

    // Choices
    const choicesEl = document.getElementById('choices-container');
    if (branch.isEnd || !branch.choices?.length) {
      hide('choices-container');
      this.showEnding();
      return;
    }

    show('choices-container');
    const keys = ['A', 'B', 'C'];
    choicesEl.innerHTML = branch.choices.map((c, i) => {
      const statTag = c.requires
        ? `<span class="choice-stat">[${STAT_LABELS[c.requires.stat] || c.requires.stat} ${c.requires.dc}]</span>`
        : `<span class="choice-stat safe">[安全]</span>`;

      const statOk = !c.requires || (Game.player.stats[c.requires.stat] || 0) >= c.requires.dc;
      const enc = c.encounter || {};

      return `
        <button class="choice-btn ${statOk ? 'active' : 'locked'}" ${!statOk ? 'disabled' : ''}
                onclick="GameUI.makeChoice('${c.id}')">
          <span class="choice-key">${keys[i] || (i+1)}</span>
          ${statTag}
          <span class="choice-text">${c.text}</span>
        </button>
      `;
    }).join('');

    // Set scene progress
    setText('scene-progress', `分支 ${Game.currentDungeon.pathTaken.length + 1}`);
    this.updateDisplay();
  },

  makeChoice(choiceId) {
    const result = Game.makeChoice(choiceId);
    if (!result) return;

    hide('choices-container');
    show('scene-result');

    const { result: outcome, nextBranch, isEnd, choice } = result;

    const resultEl = document.getElementById('result-text');
    if (resultEl) {
      const outcomeDesc = outcome.success
        ? (choice.encounter?.type === 'story' ? '你選擇了這條路。' : '你的行動成功了！')
        : '行動不太順利⋯⋯';

      const statDetail = choice.requires
        ? `<span class="roll-detail">🎲 d20 + ${Game.player.stats[choice.requires.stat] || 0} ≥ ${choice.requires.dc}</span>`
        : '';

      resultEl.innerHTML = `
        <div class="encounter-result ${outcome.success ? 'success' : 'fail'}">
          ${outcome.success ? '✅ 成功' : '❌ 失敗'}
          ${statDetail}
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
        ${Game.player.statPoints > 0 ? `<div class="level-up-notice">⬆️ 升級！獲得 <strong>${Game.player.statPoints}</strong> 屬性點，去大廳分配吧！</div>` : ''}
      `;
    }

    const continueBtn = document.getElementById('continue-btn');
    if (continueBtn) {
      continueBtn.textContent = isEnd ? '✦ 查看結局' : '➤ 繼續輪迴';
    }

    this.updateDisplay();
  },

  nextScene() {
    if (!Game.currentBranch) return;

    if (Game.currentBranch.isEnd) {
      this.finishRun();
      return;
    }

    hide('scene-result');
    const nextId = Game.currentDungeon.currentBranch;
    const nextBranch = Game.currentDungeon.branches[nextId];

    if (nextBranch) {
      this.showBranch(nextBranch);
    } else {
      this.finishRun();
    }
  },

  showEnding() {
    hide('choices-container');
    show('scene-result');

    const dungeon = Game.currentDungeon;
    const ending = dungeon.finalEnding
      ? Game.currentDungeon.endings.find(e => e.type === dungeon.finalEnding)
      : null;

    const colors = { TE: 'var(--gold)', HE: 'var(--secondary)', BE: 'var(--danger)' };
    const icons = { TE: '✦', HE: '✅', BE: '💀' };
    const bgs = {
      TE: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,152,0,0.1))',
      HE: 'linear-gradient(135deg, rgba(0,184,148,0.1), rgba(85,239,196,0.1))',
      BE: 'linear-gradient(135deg, rgba(255,107,107,0.1), rgba(225,112,85,0.1))'
    };

    const resultEl = document.getElementById('result-text');
    if (resultEl) {
      resultEl.innerHTML = `
        <div class="ending-display" style="border-color:${colors[ending?.type] || '#999'};background:${bgs[ending?.type] || 'white'}">
          <div class="ending-icon" style="color:${colors[ending?.type] || '#999'}">${icons[ending?.type] || '?'}</div>
          <div class="ending-label" style="color:${colors[ending?.type] || '#999'}">${ending?.label || '輪迴結束'}</div>
          <div class="ending-condition">${ending?.condition || ''}</div>
          <div class="ending-xp">✨ +${ending?.xpBonus || 0} EXP（結局獎勵）</div>
          ${Game.player.statPoints > 0 ? `<div class="upgrade-notice">⬆️ 獲得屬性點！</div>` : ''}
        </div>
      `;
    }

    const continueBtn = document.getElementById('continue-btn');
    if (continueBtn) {
      continueBtn.textContent = '✦ 回到大廳';
    }
  },

  finishRun() {
    Storage.clearDungeon();
    Game.currentDungeon = null;
    Game.currentBranch = null;
    hide('adventure-area');
    show('dungeon-select');
    this.updateDisplay();
  },

  _fmt(text) {
    return (text || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => GameUI.init());
} else {
  GameUI.init();
}
