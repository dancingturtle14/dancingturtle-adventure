/* ============================================
   無限流模擬器 — Supabase JS SDK Loader
   ============================================ */

// Load Supabase JS client from CDN
(function loadSupabase() {
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/@supabase/supabase-js@2';
  script.onload = function() {
    // Create the client
    window.supabaseClient = supabase.createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey
    );
    console.log('🔗 Supabase client ready');
    
    // Init helper
    SupaDB.init();
  };
  script.onerror = function() {
    console.warn('⚠️ Supabase SDK failed to load, using localStorage mode');
  };
  document.head.appendChild(script);
})();
