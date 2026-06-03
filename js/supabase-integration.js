/* ============================================
   無限流模擬器 — Supabase 主儲存層
   Server storage, not localStorage ！
   ============================================ */

let SUPABASE = null;
let _supabaseReady = false;

// ======== Init ========
(async function initSupabase() {
  try {
    await loadScript('https://unpkg.com/@supabase/supabase-js@2');

    SUPABASE = supabase.createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey,
      { auth: { persistSession: true, autoRefreshToken: true } }
    );

    // Check session
    const { data: { session } } = await SUPABASE.auth.getSession();
    _supabaseReady = true;

    if (session) {
      document.body.classList.add('supabase-connected');
      console.log('🔗 Supabase: connected as', session.user.email);
      await loadPlayerFromDB(session);

      // Real-time chat
      setupRealtimeChat();
    } else {
      console.log('🔗 Supabase: no session');
      // Redirect to login if not on index or create-character
      const page = window.location.pathname.split('/').pop();
      if (!['index.html', '', 'create-character.html'].includes(page)) {
        window.location.href = 'index.html';
      }
    }
  } catch(e) {
    console.error('❌ Supabase init failed:', e.message);
    document.body.innerHTML = `<div style="padding:40px;text-align:center"><h2>❌ 無法連接伺服器</h2><p>${e.message}</p></div>`;
  }
})();

// ======== Load player from DB ========
async function loadPlayerFromDB(session) {
  const { data: players, error } = await SUPABASE
    .from('players')
    .select('*')
    .eq('auth_id', session.user.id);

  if (error) { console.error('Load player error:', error); return; }

  if (players && players.length > 0) {
    const p = players[0];
    Game.player = {
      id: p.id,
      username: p.username,
      avatar: p.avatar,
      title: p.title,
      level: p.level,
      exp: p.exp,
      currency: p.currency,
      stamina: p.stamina_current,
      maxStamina: p.stamina_max,
      lastRecharge: Date.parse(p.stamina_last_recharge) || Date.now(),
      dailyRunsLeft: Math.max(0, 5 - (p.daily_runs_used || 0)),
      lastDailyReset: p.last_daily_reset,
      stats: p.stats || { insight: 5, survival: 5, combat: 5, puzzle: 5, luck: 5 },
      statPoints: p.stat_points || 0,
      items: [],
      completedRuns: p.completed_runs || 0,
      teCount: p.te_count || 0,
      heCount: p.he_count || 0,
      beCount: p.be_count || 0,
      achievements: p.achievements || ['初生之犢'],
      divineFound: p.divine_found || false,
    };

    // Load items
    const { data: items } = await SUPABASE
      .from('items')
      .select('*')
      .eq('owner_id', p.id);

    if (items) {
      Game.player.items = items.map(i => ({
        instanceId: i.id,
        templateId: i.template_id,
        name: i.name,
        icon: i.icon || '📦',
        rarity: i.rarity,
        slot: i.slot,
        stats: i.stats || {},
        flavor: i.flavor || '',
        obtainFrom: i.obtain_from || '',
        usefulIn: i.useful_in || [],
        sellPrice: i.sell_price || 0,
        acquiredAt: i.acquired_at,
      }));
    }

    // Override Game.save to use Supabase
    overrideGameSave();

    StaminaSystem.checkDailyReset(Game.player);

    // Notify UI that player data is ready
    document.dispatchEvent(new CustomEvent('playerReady', { detail: Game.player }));
    console.log('✅ Player loaded from Supabase:', Game.player.username);
  } else {
    // Player record doesn't exist yet — create it
    const { data: newPlayer } = await SUPABASE.from('players').insert({
      auth_id: session.user.id,
      username: session.user.email?.split('@')[0] || '冒險者',
      avatar: '🦉',
    }).select().single();

    if (newPlayer) {
      window.location.href = 'create-character.html';
    }
  }
}

// ======== Override Game.save to write to Supabase directly ========
function overrideGameSave() {
  if (!Game || !Game.player) return;

  const origSave = Game.save.bind(Game);
  Game.save = async function() {
    if (!SUPABASE || !this.player?.id) return;

    try {
      const { error } = await SUPABASE.from('players').update({
        level: this.player.level,
        exp: this.player.exp,
        currency: this.player.currency,
        stamina_current: Math.floor(StaminaSystem.getAvailable(this.player)),
        stamina_last_recharge: new Date(this.player.lastRecharge).toISOString(),
        daily_runs_used: Math.max(0, 5 - this.player.dailyRunsLeft),
        last_daily_reset: this.player.lastDailyReset,
        stats: this.player.stats,
        stat_points: this.player.statPoints || 0,
        completed_runs: this.player.completedRuns,
        te_count: this.player.teCount,
        he_count: this.player.heCount,
        be_count: this.player.beCount,
        divine_found: this.player.divineFound,
        updated_at: new Date().toISOString(),
      }).eq('id', this.player.id);

      if (error) console.warn('Player save error:', error.message);
    } catch(e) {
      console.warn('Player save failed:', e.message);
    }
  };
}

// ======== Auth API ========
const AuthAPI = {
  async signUp(email, password, username) {
    const { data, error } = await SUPABASE.auth.signUp({ email, password });
    if (error) return { error };

    if (data.user) {
      // Create player profile
      const { error: pe } = await SUPABASE.from('players').insert({
        auth_id: data.user.id,
        username: username || email.split('@')[0],
        avatar: '🦉',
      });
      if (pe) console.warn('Profile creation:', pe.message);
    }
    return { data, error: null };
  },

  async signIn(email, password) {
    return await SUPABASE.auth.signInWithPassword({ email, password });
  },

  async signOut() {
    await SUPABASE.auth.signOut();
    window.location.href = 'index.html';
  },
};

// ======== Chat API ========
const ChatAPI = {
  async getMessages(limit = 50) {
    const { data } = await SUPABASE
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data || []).reverse();
  },

  async send(username, avatar, message) {
    if (!Game.player?.id) return;
    await SUPABASE.from('chat_messages').insert({
      player_id: Game.player.id,
      username,
      avatar,
      message,
    });
  },
};

// ======== Items API ========
const ItemAPI = {
  async add(item) {
    if (!Game.player?.id || !SUPABASE) return null;
    const { data } = await SUPABASE.from('items').insert({
      owner_id: Game.player.id,
      template_id: item.templateId,
      name: item.name,
      icon: item.icon || '📦',
      rarity: item.rarity,
      slot: item.slot || 'misc',
      stats: item.stats || {},
      flavor: item.flavor || '',
      obtain_from: item.obtainFrom || '',
      useful_in: item.usefulIn || [],
      sell_price: item.sellPrice || 0,
    }).select();
    return data?.[0] || null;
  },

  async remove(itemId) {
    if (!SUPABASE) return;
    await SUPABASE.from('items').delete().eq('id', itemId);
  },

  async getAll() {
    if (!Game.player?.id || !SUPABASE) return [];
    const { data } = await SUPABASE
      .from('items')
      .select('*')
      .eq('owner_id', Game.player.id);
    return data || [];
  },
};

// ======== Run History API ========
const RunAPI = {
  async save(dungeonWorldId, endingType, xpGained, items, path) {
    if (!Game.player?.id || !SUPABASE) return;
    await SUPABASE.from('runs').insert({
      player_id: Game.player.id,
      dungeon_world_id: dungeonWorldId,
      ending_type: endingType,
      xp_gained: xpGained,
      items_gained: items,
      path_taken: path,
      completed_at: new Date().toISOString(),
    });
  },

  async getByWorld(worldId) {
    if (!Game.player?.id || !SUPABASE) return [];
    const { data } = await SUPABASE
      .from('runs')
      .select('*')
      .eq('player_id', Game.player.id)
      .eq('dungeon_world_id', worldId)
      .order('started_at', { ascending: false })
      .limit(20);
    return data || [];
  },

  async getRecent(limit = 5) {
    if (!Game.player?.id || !SUPABASE) return [];
    const { data } = await SUPABASE
      .from('runs')
      .select('*')
      .eq('player_id', Game.player.id)
      .order('started_at', { ascending: false })
      .limit(limit);
    return data || [];
  },
};

// ======== World History API ========
const WorldHistoryAPI = {
  async get(worldId) {
    if (!Game.player?.id || !SUPABASE) return null;
    const { data } = await SUPABASE
      .from('world_history')
      .select('*')
      .eq('player_id', Game.player.id)
      .eq('world_id', worldId)
      .single();
    return data;
  },

  async upsert(worldId, entryCount, bestEnding) {
    if (!Game.player?.id || !SUPABASE) return;
    await SUPABASE.from('world_history').upsert({
      player_id: Game.player.id,
      world_id: worldId,
      entry_count: entryCount,
      best_ending: bestEnding,
      last_entered_at: new Date().toISOString(),
    }, { onConflict: 'player_id,world_id' });
  },
};

// ======== Realtime Chat ========
function setupRealtimeChat() {
  if (!SUPABASE) return;
  try {
    SUPABASE
      .channel('chat_messages')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const msg = payload.new;
          if (typeof LobbyUI !== 'undefined' && LobbyUI.addChatMessage) {
            LobbyUI.addChatMessage(msg.username, msg.message, msg.avatar);
          }
        }
      )
      .subscribe();
    console.log('💬 Real-time chat active');
  } catch(e) {
    console.warn('Chat sub failed:', e.message);
  }
}

// ======== Helper ========
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
