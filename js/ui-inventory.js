/* ============================================
   無限流模擬器 — 背包 UI
   ============================================ */

const InvUI = {
  currentFilter: 'all',

  init() {
    Game.init();
    this.updateCurrency();
    this.render();
  },

  render(filter = this.currentFilter) {
    this.currentFilter = filter;
    const items = Game.player.items;
    const filtered = filter === 'all' ? items : items.filter(i => i.slot === filter);

    setText('item-count-header', items.length);

    const container = document.getElementById('inv-grid');
    const emptyEl = document.getElementById('inv-empty');
    if (!container) return;

    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    if (filtered.length === 0) {
      container.innerHTML = '';
      container.style.display = 'none';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }
    container.style.display = 'grid';
    if (emptyEl) emptyEl.style.display = 'none';

    container.innerHTML = filtered.map(item => {
      const rarity = RARITY_TIERS[item.rarity] || RARITY_TIERS.common;
      const slotIcons = { weapon: '🗡️', armor: '🛡️', shield: '🛡️', accessory: '💍', tool: '🔧', consumable: '🧪', key: '🔑' };

      // Stats display
      const statStr = Object.entries(item.stats)
        .map(([k, v]) => {
          const label = STAT_LABELS[k] || k;
          return `<span class="item-stat-tag">${label} +${v}</span>`;
        }).join('');

      return `
        <div class="inv-item-card" style="border-color:${rarity.border};background:${rarity.bg}">
          <div class="inv-item-icon" style="background:${rarity.border}22">${item.icon || slotIcons[item.slot] || '📦'}</div>
          <div class="inv-item-info">
            <div class="inv-item-name" style="color:${rarity.color}">
              [${rarity.label}] ${item.name}
            </div>
            <div class="inv-item-stats">${statStr || '—'}</div>
            <div class="inv-item-flavor">${item.flavor}</div>
            <div class="inv-item-obtain">🎯 ${item.obtainFrom}</div>
          </div>
          <div class="inv-item-actions">
            <button class="inv-action-btn sell" onclick="InvUI.sellItem('${item.instanceId}')" title="賣出">💰</button>
          </div>
        </div>
      `;
    }).join('');
  },

  filter(type) {
    this.render(type);
  },

  sellItem(instanceId) {
    const result = Game.sellItem(instanceId);
    if (result) {
      this.updateCurrency();
      this.render();
      alert(`💰 賣出 ${result.itemName}，獲得 ${result.price} 資金！`);
    }
  },

  updateCurrency() {
    setText('currency-val', Game.player.currency);
  }
};

// ======== Init ========
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => InvUI.init());
} else {
  InvUI.init();
}
