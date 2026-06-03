/* ============================================
   無限流模擬器 — 遊戲頁 UI 控制器
   ============================================ */

const GameUI = {
  init() {
    Game.init();

    // 更新 HUD
    this.updateHUD();

    // 顯示副本選擇
    this.renderDungeonList();

    // 檢查上次冒險記錄
    this.showLastRun();

    // 如果有進行中嘅冒險（demo），顯示冒險區
    if (Game.currentDungeon) {
      this.startAdventure(Game.currentDungeon);
    }

    // 登出按鈕（可選）
    const avatarEl = document.getElementById('avatar-display');
    if (avatarEl) {
      avatarEl.style.cursor = 'pointer';
      avatarEl.title = `Lv.${Game.player.level} ${Game.player.username}`;
    }
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

    // Stamin colour
    const stamEl = document.getElementById('stamina-display');
    if (stamEl) {
      const ratio = stamina.current / stamina.max;
      stamEl.style.borderColor = ratio > 0.5 ? 'var(--secondary)' : ratio > 0.2 ? 'var(--gold)' : 'var(--danger)';
      stamEl.style.border = `1px solid ${ratio > 0.5 ? 'var(--secondary)' : ratio > 0.2 ? 'var(--gold)' : 'var(--danger)'}`;
    }
  },

  renderDungeonList() {
    const container = document.getElementById('dungeon-list');
    if (!container) return;

    const available = Game.getAvailableDungeons();
    const stamina = Game.getStaminaDisplay();

    container.innerHTML = available.map(d => {
      const isLocked = Game.player.level < d.minLevel || !stamina.canRun;
      const tierColors = { F: 'var(--rank-f)', E: 'var(--rank-e)', D: 'var(--rank-d)', C: 'var(--rank-c)', B: 'var(--rank-b)', A: 'var(--rank-a)', S: 'var(--rank-s)' };

      return `
        <div class="dungeon-card ${isLocked ? 'locked' : ''}" data-dungeon="${d.id}">
          <div class="dungeon-card-header">
            <span class="dungeon-tier" style="background:${tierColors[d.tier] || '#999'}">${d.tier}</span>
            <span class="dungeon-name">${d.name}</span>
            <span class="dungeon-type">${d.type}</span>
          </div>
          <div class="dungeon-desc">${d.description}</div>
          <div class="dungeon-footer">
            <span class="dungeon-req">🔒 Lv.${d.minLevel}+</span>
            ${isLocked
              ? `<span class="dungeon-locked-msg">${Game.player.level < d.minLevel ? '等級不足' : '體力不足'}</span>`
              : `<button class="btn btn-primary dungeon-enter-btn" onclick="GameUI.enterDungeon('${d.id}')">✦ 進入</button>`
            }
          </div>
        </div>
      `;
    }).join('');
  },

  enterDungeon(dungeonId) {
    const success = Game.startRun(dungeonId);
    if (!success) {
      alert('體力不足或每日次數已用完！');
      return;
    }

    const dungeon = DUNGEONS.find(d => d.id === dungeonId);
    if (dungeon) {
      this.startAdventure(dungeon);
    }
  },

  startAdventure(dungeon) {
    // Hide dungeon select, show adventure
    hide('dungeon-select');
    show('adventure-area');

    setText('scene-dungeon-name', `${dungeon.tier}級 · ${dungeon.name}`);
    this.showScene();
  },

  showScene() {
    const scenePromise = AIGM.apiKey
      ? AIGM.generateScene(Game.currentDungeon, Game.sceneNumber, Game.player, Game.outcomes)
      : Promise.resolve(DemoScenes.generate(Game.currentDungeon, Game.sceneNumber));

    scenePromise.then(scene => {
      if (!scene) {
        scene = DemoScenes.generate(Game.currentDungeon, Game.sceneNumber);
      }

      setText('scene-progress', `場景 ${Game.sceneNumber + 1}/3`);
      hide('scene-result');
      show('choices-container');

      const narrativeEl = document.getElementById('scene-narrative');
      if (narrativeEl) {
        narrativeEl.innerHTML = `<div class="narrative-text">${this._formatNarrative(scene.narrative)}</div>`;
      }

      const choicesEl = document.getElementById('choices-container');
      if (choicesEl) {
        const keys = ['A', 'B', 'C', 'D'];
        choicesEl.innerHTML = scene.choices.map((c, i) => {
          const statTag = c.stat
            ? `<span class="choice-stat">[${STAT_LABELS[c.stat] || c.stat} ${c.dc}]</span>`
            : `<span class="choice-stat safe">[安全]</span>`;

          const statOk = !c.stat || (Game.player.stats[c.stat] || 0) >= c.dc;
          const isDisabled = !statOk ? 'disabled' : '';

          return `
            <button class="choice-btn ${statOk ? 'active' : 'locked'}" ${isDisabled}
                    onclick="GameUI.makeChoice(${c.id})">
              <span class="choice-key">${keys[i]}</span>
              ${statTag}
              <span class="choice-text">${c.text}</span>
            </button>
          `;
        }).join('');
      }
    });
  },

  async makeChoice(choiceId) {
    const result = Game.makeChoice(choiceId);
    if (!result) return;

    // Hide choices
    hide('choices-container');
    show('scene-result');

    // Show result text
    const resultEl = document.getElementById('result-text');
    if (resultEl) {
      let html = this._formatNarrative(result.narrative);

      // XP gained
      html += `<div class="xp-gain">✨ +${result.xpGained} EXP</div>`;

      // Level up?
      const player = Game.player;
      const nextLevelExp = expToLevel(player.level);
      html += `<div class="exp-bar-container">
        <div class="exp-bar-label">${player.exp}/${nextLevelExp}</div>
        <div class="exp-bar-bg">
          <div class="exp-bar-fill" style="width:${Math.min(100, (player.exp / nextLevelExp) * 100)}%"></div>
        </div>
      </div>`;

      resultEl.innerHTML = html;
    }

    // Item drop?
    const itemDropEl = document.getElementById('item-drop-display');
    if (result.itemDrop) {
      show('item-drop-display');
      const rarity = RARITY_TIERS[result.itemDrop.rarity];
      const isDivine = result.itemDrop.rarity === 'divine';

      itemDropEl.innerHTML = `
        <div class="drop-glow ${isDivine ? 'divine-glow' : ''}">
          <div class="drop-header" style="color:${rarity.color}">
            🎁 獲得物品！
          </div>
          <div class="drop-item" style="border-color:${rarity.color}">
            <span class="drop-icon">${result.itemDrop.icon}</span>
            <div>
              <div class="drop-name" style="color:${rarity.color}">
                [${rarity.label}] ${result.itemDrop.name}
              </div>
              <div class="drop-flavor">${result.itemDrop.flavor}</div>
            </div>
          </div>
        </div>
      `;

      if (isDivine) {
        itemDropEl.innerHTML += `<div class="divine-broadcast">🌟 全服廣播：有人獲得了神級物品！</div>`;
        this._divineEffect(itemDropEl);
      }
    } else {
      hide('item-drop-display');
    }

    // Ending card?
    const endingEl = document.getElementById('ending-card');
    if (result.ending) {
      show('ending-card');
      const e = result.ending;
      const colors = { TE: 'var(--gold)', HE: 'var(--secondary)', BE: 'var(--danger)' };
      const bgColors = {
        TE: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,152,0,0.1))',
        HE: 'linear-gradient(135deg, rgba(0,184,148,0.1), rgba(85,239,196,0.1))',
        BE: 'linear-gradient(135deg, rgba(255,107,107,0.1), rgba(225,112,85,0.1))'
      };

      endingEl.innerHTML = `
        <div class="ending-header" style="color:${colors[e.type]};background:${bgColors[e.type]}">
          ${e.label}
          <div style="font-size:13px;margin-top:4px;color:var(--text-light)">${e.desc}</div>
        </div>
        <div class="ending-rewards">
          <span>✨ +${e.xpBonus} EXP</span>
          <span>💰 資金不變（冒險無金幣）</span>
        </div>
        <div class="ending-clear-btn">
          <button class="btn btn-primary" onclick="GameUI.finishRun()">✦ 返回大廳</button>
          <button class="btn btn-secondary" onclick="GameUI.finishRun()">再次挑戰</button>
        </div>
      `;
      setText('continue-btn', '✦ 冒險結束');
    } else {
      hide('ending-card');
      setText('continue-btn', '➤ 繼續');
    }

    this.updateHUD();
  },

  nextScene() {
    const result = Game.outcomes[Game.outcomes.length - 1];
    if (result && result.isEnd) {
      this.finishRun();
      return;
    }
    this.showScene();
    this.updateHUD();
  },

  finishRun() {
    hide('adventure-area');
    show('dungeon-select');
    this.renderDungeonList();
    this.showLastRun();
    this.updateHUD();
  },

  showLastRun() {
    const container = document.getElementById('run-summary');
    if (!container) return;

    const outcomes = Game.outcomes;
    if (outcomes.length === 0) {
      hide('run-summary');
      return;
    }

    show('run-summary');
    const lastRun = outcomes[outcomes.length - 1];
    const ending = lastRun?.ending;

    if (ending) {
      document.getElementById('last-run-detail').innerHTML = `
        <div class="last-run-line">
          <span class="last-run-ending" style="color:${
            ending.type === 'TE' ? 'var(--gold)' : ending.type === 'HE' ? 'var(--secondary)' : 'var(--danger)'
          }">${ending.label}</span>
          <span>· ✨ +${outcomes.reduce((s, o) => s + o.xpGained, 0) + (ending?.xpBonus || 0)} EXP</span>
        </div>
      `;
    }
  },

  _formatNarrative(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  },

  _divineEffect(el) {
    // Add CSS animation for divine items
    const style = document.createElement('style');
    style.textContent = `
      @keyframes divinePulse {
        0%, 100% { box-shadow: 0 0 20px rgba(244,67,54,0.4); transform: scale(1); }
        50% { box-shadow: 0 0 60px rgba(244,67,54,0.8); transform: scale(1.02); }
      }
      .divine-glow { animation: divinePulse 1.5s ease-in-out infinite; }
      .divine-broadcast {
        background: linear-gradient(135deg, #f44336, #e91e63);
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        margin-top: 12px;
        font-weight: 700;
        text-align: center;
        font-size: 14px;
        animation: divinePulse 1.5s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
  }
};

// ======== Init ========
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => GameUI.init());
} else {
  GameUI.init();
}
