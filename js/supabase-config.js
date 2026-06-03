/* ============================================
   無限流模擬器 — Supabase Client Config
   ============================================ */

const SUPABASE_CONFIG = {
  url: 'https://wknatbgczprsuuchqmgu.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrbmF0YmdjenByc3V1Y2hxbWd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NTY4NTMsImV4cCI6MjA5NjAzMjg1M30.m6c4otpYKLd-kvkFEXw5RuBBtlW2dWeqGTnee4J42qI',
};

// Will be initialized by supabase.js after JS client loads
let SUPABASE = null;

// ======== Supabase Helper Functions ========
const SupaDB = {
  ready() {
    return SUPABASE !== null;
  },

  async init() {
    if (SUPABASE) return true;
    try {
      if (typeof supabaseClient !== 'undefined') {
        SUPABASE = supabaseClient;
        return true;
      }
      return false;
    } catch(e) {
      console.warn('Supabase not available:', e.message);
      return false;
    }
  },

  // Auth
  async signUp(email, password, username) {
    if (!this.ready()) return null;
    const { data, error } = await SUPABASE.auth.signUp({ email, password });
    if (error) return { error };
    if (data.user) {
      // Create player profile
      const { error: profileError } = await SUPABASE.from('players').insert({
        auth_id: data.user.id,
        username,
        avatar: '🦉',
      });
      if (profileError) console.warn('Profile creation:', profileError.message);
    }
    return { data, error: null };
  },

  async signIn(email, password) {
    if (!this.ready()) return null;
    const { data, error } = await SUPABASE.auth.signInWithPassword({ email, password });
    return { data, error };
  },

  async signOut() {
    if (!this.ready()) return;
    await SUPABASE.auth.signOut();
    localStorage.removeItem('wuxianliu_save');
    window.location.href = 'index.html';
  },

  getSession() {
    return SUPABASE?.auth?.getSession() || null;
  },

  // Data
  async getPlayer() {
    if (!this.ready()) return null;
    const session = await this.getSession();
    if (!session?.data?.session) return null;
    const { data } = await SUPABASE.from('players')
      .select('*')
      .eq('auth_id', session.data.session.user.id)
      .single();
    return data;
  },

  async savePlayer(playerData) {
    if (!this.ready()) return;
    const session = await this.getSession();
    if (!session?.data?.session) return;
    await SUPABASE.from('players')
      .update(playerData)
      .eq('auth_id', session.data.session.user.id);
  },

  async getItems() {
    if (!this.ready()) return [];
    const session = await this.getSession();
    if (!session?.data?.session) return [];
    const player = await this.getPlayer();
    if (!player) return [];
    const { data } = await SUPABASE.from('items')
      .select('*')
      .eq('owner_id', player.id);
    return data || [];
  },

  async saveItem(item) {
    if (!this.ready()) return;
    const session = await this.getSession();
    if (!session?.data?.session) return;
    const player = await this.getPlayer();
    if (!player) return;
    await SUPABASE.from('items').insert({ ...item, owner_id: player.id });
  },

  async deleteItem(itemId) {
    if (!this.ready()) return;
    await SUPABASE.from('items').delete().eq('id', itemId);
  },

  // Chat
  async getChatMessages(limit = 50) {
    if (!this.ready()) return [];
    const { data } = await SUPABASE.from('chat_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data || []).reverse();
  },

  async sendChatMessage(username, avatar, message) {
    if (!this.ready()) return;
    const session = await this.getSession();
    if (!session?.data?.session) return;
    const player = await this.getPlayer();
    if (!player) return;
    await SUPABASE.from('chat_messages').insert({
      player_id: player.id,
      username,
      avatar,
      message,
    });
  },

  // Dungeon instances
  async saveDungeonInstance(instance) {
    if (!this.ready()) return null;
    const { data } = await SUPABASE.from('dungeon_instances').insert(instance).select();
    return data?.[0] || null;
  },

  async getDungeonHistory(worldId) {
    if (!this.ready()) return [];
    const session = await this.getSession();
    if (!session?.data?.session) return [];
    const player = await this.getPlayer();
    if (!player) return [];
    const { data } = await SUPABASE.from('runs')
      .select('*')
      .eq('player_id', player.id)
      .eq('dungeon_world_id', worldId)
      .order('started_at', { ascending: false })
      .limit(20);
    return data || [];
  },

  async saveRun(runData) {
    if (!this.ready()) return;
    await SUPABASE.from('runs').insert(runData);
  },

  // Trade
  async getActiveListings() {
    if (!this.ready()) return [];
    const { data } = await SUPABASE.from('trade_listings')
      .select('*, items(*)')
      .eq('status', 'active');
    return data || [];
  },

  async createListing(sellerId, itemId, price) {
    if (!this.ready()) return;
    await SUPABASE.from('trade_listings').insert({
      seller_id: sellerId,
      item_id: itemId,
      price,
    });
  },
};
