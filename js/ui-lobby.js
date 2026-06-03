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
  },

  setupChat() {
    const input = document.getElementById('chat-input');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.sendChat();
      });
    }

    // Load chat history from localStorage
    this.loadChatHistory();
  },

  sendChat() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    input.value = '';

    const p = Game.player;
    this.addChatMessage(p.username, text, p.avatar);
    this.saveChatMessage(p.username, text, p.avatar);
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
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => LobbyUI.init());
} else {
  LobbyUI.init();
}
