/* ============================================
   無限流模擬器 — 大廳 UI
   ============================================ */

const LobbyUI = {
  init() {
    Game.init();
    this.updateAll();
    this.setupChat();
  },

  updateAll() {
    const p = Game.player;
    setText('stamina-val', Math.floor(StaminaSystem.getAvailable(p)));
    setText('daily-val', p.dailyRunsLeft);
    setText('currency-val', p.currency);
    setText('avatar-display', p.avatar);
    setText('mobile-avatar', p.avatar);
    setText('mobile-name', `${p.username} · Lv.`);
    setText('mobile-level', p.level);
    setText('mobile-exp', p.exp);

    setText('lobby-avatar', p.avatar);
    setText('lobby-name', p.username);
    setText('lobby-title', p.title);
    setText('lobby-level', p.level);

    setText('stat-insight', p.stats.insight);
    setText('stat-survival', p.stats.survival);
    setText('stat-combat', p.stats.combat);
    setText('stat-puzzle', p.stats.puzzle);
    setText('stat-luck', p.stats.luck);

    setText('run-total', p.completedRuns);
    setText('run-te', p.teCount);
    setText('run-be', p.beCount);

    const stamina = StaminaSystem.getAvailable(p);
    setText('stm-val', Math.floor(stamina));
    setText('stm-max', p.maxStamina);
    const fillPct = Math.min(100, (stamina / p.maxStamina) * 100);
    const fillEl = document.getElementById('stm-fill');
    if (fillEl) fillEl.style.width = fillPct + '%';
    const stmBg = document.getElementById('stm-fill');
    if (stmBg) {
      stmBg.style.background = fillPct > 50
        ? 'linear-gradient(90deg, #4caf50, #8bc34a)'
        : fillPct > 20
          ? 'linear-gradient(90deg, #ff9800, #ffc107)'
          : 'linear-gradient(90deg, #f44336, #ff5722)';
    }

    setText('daily-left', p.dailyRunsLeft);
    setText('item-count', p.items.length);

    // Stat points section
    const spEl = document.getElementById('statpoints-section');
    if (spEl) {
      if (p.statPoints > 0) {
        spEl.style.display = 'block';
        setText('sp-available', p.statPoints);
        this.renderStatUpgrades();
      } else {
        spEl.style.display = 'none';
      }
    }
  },

  renderStatUpgrades() {
    const container = document.getElementById('stat-upgrade-list');
    if (!container) return;

    const p = Game.player;
    const stats = [
      { key: 'insight', label: '洞察力', icon: '🔍', desc: '發現線索、觀察細節' },
      { key: 'survival', label: '生存力', icon: '🛡️', desc: '迴避危險、承受傷害' },
      { key: 'combat', label: '戰鬥力', icon: '⚔️', desc: '直接對抗、武力解決' },
      { key: 'puzzle', label: '解謎力', icon: '🧩', desc: '破解機關、理解規則' },
      { key: 'luck', label: '運氣', icon: '🍀', desc: '隨機事件、意外發現' },
    ];

    container.innerHTML = stats.map(s => {
      const val = p.stats[s.key] || 0;
      const maxed = val >= 20;
      return `
        <div class="sp-row">
          <div class="sp-info">
            <span class="sp-icon">${s.icon}</span>
            <div>
              <div class="sp-label">${s.label} <span class="sp-val">${val}</span>${maxed ? '<span class="sp-maxed">MAX</span>' : ''}</div>
              <div class="sp-desc">${s.desc}</div>
            </div>
          </div>
          <button class="sp-btn ${maxed || p.statPoints <= 0 ? 'disabled' : ''}"
                  onclick="LobbyUI.upgradeStat('${s.key}')"
                  ${maxed || p.statPoints <= 0 ? 'disabled' : ''}>+</button>
        </div>
      `;
    }).join('');
  },

  upgradeStat(statKey) {
    const result = Game.spendStatPoint(statKey);
    if (result) {
      this.updateAll();
    }
  },

  setupChat() {
    const input = document.getElementById('chat-input');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.sendChat();
      });
    }

    // Load chat from Supabase
    this.loadChatFromServer();
  },

  async sendChat() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    input.value = '';

    const p = Game.player;
    // Add locally immediately
    this.addChatMessage(p.username, text, p.avatar);
    // Send to server
    await ChatAPI.send(p.username, p.avatar, text);
  },

  async loadChatFromServer() {
    try {
      const messages = await ChatAPI.getMessages(50);
      messages.forEach(msg => {
        this.addChatMessage(msg.username, msg.message, msg.avatar);
      });
    } catch(e) {
      console.warn('Chat load failed:', e.message);
    }
  },

  addChatMessage(username, text, avatar) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'chat-msg';
    div.innerHTML = `
      <span class="chat-avatar">${avatar}</span>
      <span class="chat-name">${this.escapeHtml(username)}</span>
      <span class="chat-text">${this.escapeHtml(text)}</span>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  },

  addSystemMessage(text) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'chat-msg system';
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  },

  saveChatMessage(username, text, avatar) {
    try {
      const history = JSON.parse(localStorage.getItem('chat_history') || '[]');
      history.push({
        username, text, avatar,
        time: new Date().toISOString()
      });
      // Keep last 200 messages
      if (history.length > 200) history.splice(0, history.length - 200);
      localStorage.setItem('chat_history', JSON.stringify(history));
    } catch(e) { /* ignore */ }
  },

  loadChatHistory() {
    try {
      const history = JSON.parse(localStorage.getItem('chat_history') || '[]');
      // Show last 50 messages
      const recent = history.slice(-50);
      recent.forEach(msg => {
        this.addChatMessage(msg.username, msg.text, msg.avatar);
      });
    } catch(e) { /* ignore */ }
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// ======== Init ========
document.addEventListener('playerReady', () => {
  LobbyUI.init();
});

// Fallback: if playerReady never fires (no Supabase session), show login link
setTimeout(() => {
  if (!Game.player?.username) {
    alert('請先登入！');
    window.location.href = 'index.html';
  }
}, 5000);
