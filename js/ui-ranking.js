/* ============================================
   無限流模擬器 — 排行榜 UI
   ============================================ */

const RankUI = {
  init() {
    Game.init();
    this.render();
  },

  getRankings() {
    const p = Game.player;

    // Calculate player's rating
    const tierWeight = { F: 10, E: 25, D: 50, C: 100, B: 200, A: 400 };
    const runScore = p.completedRuns * 25;
    const teBonus = p.teCount * 300;
    const bePenalty = p.beCount * -20;

    // Item score
    const itemRarityWeights = { common: 5, uncommon: 15, rare: 50, epic: 200, legendary: 800, divine: 5000 };
    const itemScore = p.items.reduce((s, i) => s + (itemRarityWeights[i.rarity] || 0), 0);

    const playerRating = Math.max(0, runScore + teBonus + bePenalty + itemScore);

    // Mock NPC players
    const npcs = [
      { name: '蒼穹行者', avatar: '🌌', title: '深淵領主', rating: 15840, clears: 43, teCount: 7, tier: 'S' },
      { name: '血薔薇', avatar: '🌹', title: '副本終結者', rating: 12920, clears: 38, teCount: 5, tier: 'A' },
      { name: '渡鴉', avatar: '🐦‍⬛', title: '真相獵人', rating: 11560, clears: 35, teCount: 6, tier: 'A' },
      { name: '無名', avatar: '🥷', title: '隱士', rating: 10230, clears: 40, teCount: 4, tier: 'A' },
      { name: '星辰', avatar: '⭐', title: '星光引路人', rating: 9840, clears: 32, teCount: 5, tier: 'A' },
      { name: '夜幕', avatar: '🌙', title: '暗影行者', rating: 8720, clears: 29, teCount: 3, tier: 'B' },
      { name: '白狐', avatar: '🦊', title: '幸運兒', rating: 7650, clears: 31, teCount: 2, tier: 'B' },
      { name: '青龍', avatar: '🐉', title: '武鬥家', rating: 6980, clears: 27, teCount: 3, tier: 'B' },
      { name: '琥珀', avatar: '🔮', title: '收藏家', rating: 5320, clears: 22, teCount: 2, tier: 'C' },
      { name: '疾風', avatar: '🌪️', title: '速通者', rating: 4210, clears: 19, teCount: 1, tier: 'C' },
    ];

    // Determine player tier
    const playerTier = playerRating > 10000 ? 'S' : playerRating > 8000 ? 'A' : playerRating > 5000 ? 'B' : playerRating > 2000 ? 'C' : playerRating > 500 ? 'D' : 'E';

    const all = [...npcs, { name: p.username, avatar: p.avatar, title: p.title, rating: playerRating, clears: p.completedRuns, teCount: p.teCount, tier: playerTier }];
    all.sort((a, b) => b.rating - a.rating);
    return all.slice(0, 20).map((entry, i) => ({ ...entry, rank: i + 1 }));
  },

  render() {
    const container = document.getElementById('ranking-list');
    if (!container) return;

    const rankings = this.getRankings();
    const pName = Game.player.username;

    container.innerHTML = rankings.map(r => {
      const isMe = r.name === pName;
      const medal = r.rank <= 3 ? ['🥇','🥈','🥉'][r.rank-1] : `#${r.rank}`;
      const rankClass = r.rank <= 3 ? `top${r.rank}` : '';

      return `
        <div class="ranking-row ${isMe ? 'me' : ''}">
          <div class="rank-num ${rankClass}">${medal}</div>
          <div class="rank-avatar">${r.avatar}</div>
          <div class="rank-info">
            <div class="rank-name">${r.name} ${isMe ? '<span class="rank-you">(你)</span>' : ''}</div>
            <div class="rank-title-small">${r.title} · ${r.tier}級</div>
          </div>
          <div class="rank-stats">
            <div class="rank-stat">
              <div class="num">${r.rating.toLocaleString()}</div>
              <div style="font-size:10px">評分</div>
            </div>
            <div class="rank-stat">
              <div class="num">${r.clears}</div>
              <div style="font-size:10px">通關</div>
            </div>
            <div class="rank-stat">
              <div class="num">${r.teCount}</div>
              <div style="font-size:10px">TE</div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    setText('currency-val', Game.player.currency);
  },

  switchTab(btn) {
    document.querySelectorAll('.ranking-tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const sort = btn.dataset.sort;
    const container = document.getElementById('ranking-list');
    if (!container) return;

    let rankings = this.getRankings();
    if (sort === 'clears') rankings.sort((a, b) => b.clears - a.clears);
    else if (sort === 'te') rankings.sort((a, b) => b.teCount - a.teCount);

    rankings.forEach((r, i) => r.rank = i + 1);
    this.renderSort(rankings);
  },

  renderSort(rankings) {
    const container = document.getElementById('ranking-list');
    const pName = Game.player.username;

    container.innerHTML = rankings.map(r => {
      const isMe = r.name === pName;
      const medal = r.rank <= 3 ? ['🥇','🥈','🥉'][r.rank-1] : `#${r.rank}`;
      const rankClass = r.rank <= 3 ? `top${r.rank}` : '';

      return `
        <div class="ranking-row ${isMe ? 'me' : ''}">
          <div class="rank-num ${rankClass}">${medal}</div>
          <div class="rank-avatar">${r.avatar}</div>
          <div class="rank-info">
            <div class="rank-name">${r.name} ${isMe ? '<span class="rank-you">(你)</span>' : ''}</div>
            <div class="rank-title-small">${r.title} · ${r.tier}級</div>
          </div>
          <div class="rank-stats">
            <div class="rank-stat">
              <div class="num">${r.rating.toLocaleString()}</div>
              <div style="font-size:10px">評分</div>
            </div>
            <div class="rank-stat">
              <div class="num">${r.clears}</div>
              <div style="font-size:10px">通關</div>
            </div>
            <div class="rank-stat">
              <div class="num">${r.teCount}</div>
              <div style="font-size:10px">TE</div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => RankUI.init());
} else {
  RankUI.init();
}
