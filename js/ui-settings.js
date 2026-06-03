/* ============================================
   無限流模擬器 — 設定 UI
   ============================================ */

const SettingsUI = {
  init() {
    // Load AI key on init
    AIGM.loadApiKey();
  },

  open() {
    // Remove existing modal if any
    document.querySelector('.settings-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'settings-overlay';
    overlay.id = 'settings-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000;
    `;

    const key = AIGM.apiKey;
    const model = AIGM.settings.model;
    const maskedKey = key ? key.slice(0, 8) + '...' + key.slice(-4) : '';
    const hasKey = !!key;

    overlay.innerHTML = `
      <div class="settings-modal" style="
        background: white; border-radius: 16px; padding: 32px;
        width: 440px; max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      ">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
          <h2 style="font-size:20px;font-weight:900">⚙️ 設定</h2>
          <button onclick="SettingsUI.close()" style="background:none;border:none;font-size:24px;cursor:pointer">✕</button>
        </div>

        <div style="margin-bottom:20px">
          <label style="font-weight:600;font-size:14px;display:block;margin-bottom:8px">
            🤖 OpenRouter API Key ${hasKey ? '<span style="color:var(--secondary);font-size:12px">✅ 已設定</span>' : '<span style="color:var(--danger);font-size:12px">❌ 未設定</span>'}
          </label>
          <p style="font-size:12px;color:var(--text-muted);margin-bottom:8px">
            設定後 AI GM 會自動生成獨一無二的場景和劇情。無 key 時使用示範場景。
          </p>
          <input type="password" id="settings-api-key" class="form-input"
                 placeholder="sk-or-v1-..." value="${key}"
                 style="font-family:monospace;font-size:12px">
          ${hasKey ? `<div style="font-size:11px;color:var(--text-muted);margin-top:4px">當前：${maskedKey}</div>` : ''}
        </div>

        <div style="margin-bottom:24px">
          <label style="font-weight:600;font-size:14px;display:block;margin-bottom:8px">Model</label>
          <select id="settings-model" class="form-input" style="font-family:monospace;font-size:13px">
            <option value="openrouter/anthropic/claude-3.5-sonnet" ${model === 'openrouter/anthropic/claude-3.5-sonnet' ? 'selected' : ''}>Claude 3.5 Sonnet</option>
            <option value="openrouter/google/gemini-2.0-flash" ${model === 'openrouter/google/gemini-2.0-flash' ? 'selected' : ''}>Gemini 2.0 Flash</option>
            <option value="openrouter/meta-llama/llama-3.1-70b-instruct" ${model === 'openrouter/meta-llama/llama-3.1-70b-instruct' ? 'selected' : ''}>Llama 3.1 70B</option>
            <option value="openrouter/qwen/qwen-2.5-72b-instruct" ${model === 'openrouter/qwen/qwen-2.5-72b-instruct' ? 'selected' : ''}>Qwen 2.5 72B</option>
            <option value="openrouter/nousresearch/hermes-3-llama-3.1-405b" ${model === 'openrouter/nousresearch/hermes-3-llama-3.1-405b' ? 'selected' : ''}>Hermes 3 405B</option>
          </select>
        </div>

        <div style="margin-bottom:20px;padding:12px;background:var(--bg-card-alt);border-radius:8px;font-size:13px;color:var(--text-light)">
          <strong>💡 提示：</strong>無需設定 key 都可以玩！未設定 key 時會使用內建示範場景。
        </div>

        <div style="display:flex;gap:10px">
          <button class="btn btn-primary" onclick="SettingsUI.save()" style="flex:2">💾 儲存</button>
          <button class="btn btn-secondary" onclick="SettingsUI.clearKey()" style="flex:1">🗑️ 清除 Key</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) SettingsUI.close();
    });
  },

  close() {
    document.getElementById('settings-overlay')?.remove();
  },

  save() {
    const keyInput = document.getElementById('settings-api-key');
    const modelSelect = document.getElementById('settings-model');
    if (!keyInput) return;

    const key = keyInput.value.trim();
    const model = modelSelect.value;

    AIGM.setApiKey(key);
    AIGM.settings.model = model;
    localStorage.setItem('aigm_model', model);

    this.close();
    alert('✅ 設定已儲存！AI GM 已啟用。');
  },

  clearKey() {
    if (!confirm('確定清除 API Key？')) return;
    AIGM.setApiKey('');
    localStorage.removeItem('aigm_model');
    this.close();
    alert('✅ API Key 已清除，將使用示範場景。');
  }
};

// Init
if (typeof AIGM !== 'undefined') {
  SettingsUI.init();
}
