/* ============================================
   無限流模擬器 — Supabase 整合入口
   Loads Supabase SDK + connects all pages
   ============================================ */

(async function initSupabase() {
  try {
    // Load Supabase JS from CDN
    await loadScript('https://unpkg.com/@supabase/supabase-js@2');
    
    // Create client
    window._supabase = supabase.createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        }
      }
    );
    
    SUPABASE = window._supabase;

    // Check session
    const { data: { session } } = await SUPABASE.auth.getSession();
    
    if (session) {
      document.body.classList.add('supabase-connected');
      console.log('🔗 Supabase: connected as', session.user.email);
      
      // Load player data
      const { data: player } = await SUPABASE
        .from('players')
        .select('*')
        .eq('auth_id', session.user.id)
        .single();
      
      if (player) {
        // Migrate localStorage data to Supabase if needed
        const localPlayer = Storage.load();
        if (localPlayer && localPlayer.id) {
          // Merge: Supabase has priority, but fill missing fields from localStorage
          const merged = { ...player };
          let changed = false;
          for (const key of ['level', 'exp', 'currency', 'stamina_current', 'completed_runs', 'te_count', 'he_count', 'be_count']) {
            const dbKey = key === 'stamina_current' ? 'stamina_current' : key;
            if (localPlayer[key] !== undefined && localPlayer[key] > (player[dbKey] || 0)) {
              merged[dbKey] = localPlayer[key];
              changed = true;
            }
          }
          if (changed) {
            await SUPABASE.from('players').update(merged).eq('id', player.id);
          }
        }
        
        // Override Game.player with Supabase data
        Game.player = {
          id: player.id,
          username: player.username,
          avatar: player.avatar,
          title: player.title,
          level: player.level,
          exp: player.exp,
          currency: player.currency,
          stamina: player.stamina_current,
          maxStamina: player.stamina_max,
          lastRecharge: Date.parse(player.stamina_last_recharge) || Date.now(),
          dailyRunsLeft: Math.max(0, 5 - (player.daily_runs_used || 0)),
          lastDailyReset: player.last_daily_reset,
          stats: player.stats || { insight: 5, survival: 5, combat: 5, puzzle: 5, luck: 5 },
          items: [],
          completedRuns: player.completed_runs || 0,
          teCount: player.te_count || 0,
          heCount: player.he_count || 0,
          beCount: player.be_count || 0,
          achievements: player.achievements || ['初生之犢'],
          divineFound: player.divine_found || false,
        };

        // Load items from Supabase
        const { data: items } = await SUPABASE
          .from('items')
          .select('*')
          .eq('owner_id', player.id);
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

        Game.save();
        console.log('✅ Player data synced from Supabase');
      }
    } else {
      console.log('🔗 Supabase: no session, using localStorage');
    }
    
    // Set up realtime chat subscription
    setupRealtimeChat();
    
  } catch(e) {
    console.warn('⚠️ Supabase init failed:', e.message);
    console.log('🔗 Using localStorage fallback');
  }
})();

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

function setupRealtimeChat() {
  if (!SUPABASE) return;
  
  try {
    const channel = SUPABASE
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
    
    console.log('💬 Real-time chat subscribed');
  } catch(e) {
    console.warn('Chat subscription failed:', e.message);
  }
}

// ======== Save hook — sync to Supabase when Game.save() is called ========
const _origSave = Game.save;
Game.save = async function() {
  _origSave.call(this);
  
  if (!SUPABASE || !this.player?.id) return;
  
  try {
    await SUPABASE.from('players').update({
      level: this.player.level,
      exp: this.player.exp,
      currency: this.player.currency,
      stamina_current: Math.floor(StaminaSystem.getAvailable(this.player)),
      stamina_last_recharge: new Date(this.player.lastRecharge).toISOString(),
      daily_runs_used: Math.max(0, 5 - this.player.dailyRunsLeft),
      last_daily_reset: this.player.lastDailyReset,
      completed_runs: this.player.completedRuns,
      te_count: this.player.teCount,
      he_count: this.player.heCount,
      be_count: this.player.beCount,
      divine_found: this.player.divineFound,
      updated_at: new Date().toISOString(),
    }).eq('id', this.player.id);
  } catch(e) {
    // Silent fail — localStorage still works as fallback
  }
};

// ======== Override SupaDB functions to actually save items ========
SupaDB.saveItem = async function(item) {
  if (!SUPABASE || !Game.player?.id) return;
  const { data } = await SUPABASE.from('items').insert({
    owner_id: Game.player.id,
    template_id: item.templateId,
    name: item.name,
    icon: item.icon,
    rarity: item.rarity,
    slot: item.slot,
    stats: item.stats,
    flavor: item.flavor,
    obtain_from: item.obtainFrom,
    useful_in: item.usefulIn,
    sell_price: item.sellPrice,
  }).select();
  return data?.[0];
};

SupaDB.deleteItem = async function(itemId) {
  if (!SUPABASE) return;
  await SUPABASE.from('items').delete().eq('id', itemId);
};

SupaDB.sendChatMessage = async function(username, avatar, message) {
  if (!SUPABASE || !Game.player?.id) return;
  await SUPABASE.from('chat_messages').insert({
    player_id: Game.player.id,
    username,
    avatar,
    message,
  });
};
