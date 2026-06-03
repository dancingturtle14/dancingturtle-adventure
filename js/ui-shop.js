/* ============================================
   無限流模擬器 — 商店 UI
   ============================================ */

const ShopUI = {
  init() {
    Game.init();
    this.updateCurrency();
    this.render();
  },

  render() {
    const items = Game.player.items.filter(i => i.sellPrice > 0);
    const container = document.getElementById('shop-items');
    const emptyEl = document.getElementById('shop-empty');
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = '';
      container.style.display = 'none';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }
    container.style.display = 'block';
    if (emptyEl) emptyEl.style.display = 'none';

    container.innerHTML = items.map(item => {
      const rarity = RARITY_TIERS[item.rarity] || RARITY_TIERS.common;
      const price = Math.floor((item.sellPrice || 0) * (0.2 + Math.random() * 0.1));

      return `
        <div class="shop-item-row" style="border-left: 4px solid ${rarity.color}">
          <div class="shop-item-icon">${item.icon || '📦'}</div>
          <div class="shop-item-info">
            <div class="shop-item-name" style="color:${rarity.color}">[${rarity.label}] ${item.name}</div>
            <div class="shop-item-stats">
              ${Object.entries(item.stats).map(([k, v]) => {
                const label = STAT_LABELS[k] || k;
                return `<span class="item-stat-tag">${label} +${v}</span>`;
              }).join('')}
            </div>
          </div>
          <div class="shop-item-price">💰 ${price}</div>
          <button class="btn btn-secondary sell-btn" onclick="ShopUI.sell('${item.instanceId}')">賣出</button>
        </div>
      `;
    }).join('');
  },

  sell(instanceId) {
    const result = Game.sellItem(instanceId);
    if (result) {
      this.updateCurrency();
      this.render();
    }
  },

  updateCurrency() {
    setText('currency-display', Game.player.currency);
    setText('currency-val', Game.player.currency);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ShopUI.init());
} else {
  ShopUI.init();
}
