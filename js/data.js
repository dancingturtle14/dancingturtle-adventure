/* ============================================
   無限流模擬器 — 資料模型
   ============================================ */

// ======== 稀有度定義 ========
const RARITY_TIERS = {
  common:    { id: 'common',    label: '普通',   color: '#b0b0b0', bg: 'rgba(176,176,176,0.12)', border: '#b0b0b0', weight: 600, dropChance: 0.60 },
  uncommon:  { id: 'uncommon',  label: '優秀',   color: '#4caf50', bg: 'rgba(76,175,80,0.12)',  border: '#4caf50', weight: 250, dropChance: 0.25 },
  rare:      { id: 'rare',      label: '稀有',   color: '#2196f3', bg: 'rgba(33,150,243,0.12)', border: '#2196f3', weight: 100, dropChance: 0.10 },
  epic:      { id: 'epic',      label: '史詩',   color: '#9c27b0', bg: 'rgba(156,39,176,0.12)', border: '#9c27b0', weight: 40,  dropChance: 0.04 },
  legendary: { id: 'legendary', label: '傳說',   color: '#ff9800', bg: 'rgba(255,152,0,0.12)',  border: '#ff9800', weight: 9,   dropChance: 0.0099 },
  divine:    { id: 'divine',    label: '✦神級',  color: '#f44336', bg: 'rgba(244,67,54,0.15)',  border: '#f44336', weight: 1,   dropChance: 0.001, animate: true },
};

const RARITY_ORDER = ['common','uncommon','rare','epic','legendary','divine'];
const RARITY_LIST = Object.values(RARITY_TIERS);

// ======== 掉落權重表（有物品掉落時用）=======
function rollRarity() {
  const totalWeight = RARITY_LIST.reduce((s, t) => s + t.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const tier of RARITY_LIST) {
    roll -= tier.weight;
    if (roll <= 0) return tier.id;
  }
  return 'common';
}

// ======== 物品模板庫 ========
const ITEM_TEMPLATES = {
  // ── Common ──
  'iron_sword': {
    id: 'iron_sword', name: '鐵劍', icon: '🗡️', rarity: 'common',
    slot: 'weapon', baseStats: { attack: { min: 3, max: 6 } },
    flavor: '一把普通的鐵劍，略顯鏽蝕。',
    obtainFrom: '通用掉落', usefulIn: [],
    sellPrice: 5
  },
  'cloth_armor': {
    id: 'cloth_armor', name: '布甲', icon: '👕', rarity: 'common',
    slot: 'armor', baseStats: { defense: { min: 2, max: 4 } },
    flavor: '粗糙的麻布編織而成，聊勝於無。',
    obtainFrom: '通用掉落', usefulIn: [],
    sellPrice: 4
  },
  'wooden_shield': {
    id: 'wooden_shield', name: '木盾', icon: '🛡️', rarity: 'common',
    slot: 'shield', baseStats: { defense: { min: 3, max: 5 } },
    flavor: '一塊結實的橡木板，勉強可以擋住攻擊。',
    obtainFrom: '通用掉落', usefulIn: [],
    sellPrice: 5
  },
  'herb': {
    id: 'herb', name: '草藥', icon: '🌿', rarity: 'common',
    slot: 'consumable', baseStats: { heal: { min: 10, max: 15 } },
    flavor: '曬乾的草藥，嚼碎後能稍稍止血。',
    obtainFrom: '通用掉落', usefulIn: [],
    sellPrice: 3
  },
  'old_key': {
    id: 'old_key', name: '生鏽鑰匙', icon: '🔑', rarity: 'common',
    slot: 'key', baseStats: {},
    flavor: '一把生了鏽的銅鑰匙，不知道能開什麼門。',
    obtainFrom: '通用掉落', usefulIn: ['沉睡村莊'],
    sellPrice: 2
  },
  'bone_charm': {
    id: 'bone_charm', name: '骨製護符', icon: '🦴', rarity: 'common',
    slot: 'accessory', baseStats: { luck: { min: 1, max: 2 } },
    flavor: '用不知名生物的骨頭雕刻而成，散發著微弱的氣息。',
    obtainFrom: '通用掉落', usefulIn: [],
    sellPrice: 6
  },

  // ── Uncommon ──
  'steel_sword': {
    id: 'steel_sword', name: '鋼鐵劍', icon: '⚔️', rarity: 'uncommon',
    slot: 'weapon', baseStats: { attack: { min: 7, max: 12 } },
    flavor: '經過精心鍛造的鋼劍，鋒利耐用。',
    obtainFrom: '通用掉落', usefulIn: [],
    sellPrice: 18
  },
  'leather_armor': {
    id: 'leather_armor', name: '皮甲', icon: '🦺', rarity: 'uncommon',
    slot: 'armor', baseStats: { defense: { min: 5, max: 9 } },
    flavor: '用鞣製過的牛皮製成，兼顧靈活與防護。',
    obtainFrom: '通用掉落', usefulIn: [],
    sellPrice: 15
  },
  'torch': {
    id: 'torch', name: '不滅火炬', icon: '🔥', rarity: 'uncommon',
    slot: 'tool', baseStats: { insight: { min: 2, max: 4 } },
    flavor: '一根永不熄滅的火炬，能照亮黑暗中的隱藏細節。',
    obtainFrom: '迷霧森林', usefulIn: ['遺忘圖書館'],
    sellPrice: 12
  },
  'moon_pendant': {
    id: 'moon_pendant', name: '月光墜飾', icon: '🌙', rarity: 'uncommon',
    slot: 'accessory', baseStats: { heal: { min: 5, max: 8 }, luck: { min: 1, max: 2 } },
    flavor: '在月圓之夜吸收月光的飾品，佩戴者感到一陣安心。',
    obtainFrom: '通用掉落', usefulIn: ['血月劇院'],
    sellPrice: 20
  },
  'silver_dagger': {
    id: 'silver_dagger', name: '銀匕首', icon: '🗡️', rarity: 'uncommon',
    slot: 'weapon', baseStats: { attack: { min: 5, max: 9 }, speed: { min: 1, max: 2 } },
    flavor: '純銀打造的匕首，對某些存在有特殊效果。',
    obtainFrom: '通用掉落', usefulIn: ['血月劇院'],
    sellPrice: 22
  },

  // ── Rare ──
  'void_blade': {
    id: 'void_blade', name: '虛空之刃', icon: '🗡️', rarity: 'rare',
    slot: 'weapon', baseStats: { attack: { min: 14, max: 22 } },
    flavor: '這把劍曾屬於一位不知名的騎士，劍身上刻著一行模糊的字跡：「面對虛空，勿失本心」。',
    obtainFrom: '虛空之門', usefulIn: ['深淵遺跡'],
    sellPrice: 60
  },
  'enigma_ring': {
    id: 'enigma_ring', name: '謎之戒', icon: '💍', rarity: 'rare',
    slot: 'accessory', baseStats: { insight: { min: 5, max: 8 }, puzzle: { min: 3, max: 6 } },
    flavor: '戒指內側刻著一個不斷變化的符號。據說戴上它的人能看見世界的另一面。',
    obtainFrom: '遺忘圖書館', usefulIn: ['血月劇院', '迷霧森林'],
    sellPrice: 75
  },
  'phantom_cloak': {
    id: 'phantom_cloak', name: '幽靈斗篷', icon: '🧥', rarity: 'rare',
    slot: 'armor', baseStats: { defense: { min: 10, max: 16 }, survival: { min: 3, max: 5 } },
    flavor: '據說這斗篷的前任主人在戰場上消失了，只留下這件在風中飄動的空斗篷。',
    obtainFrom: '迷霧森林', usefulIn: ['血月劇院'],
    sellPrice: 70
  },
  'ancient_compass': {
    id: 'ancient_compass', name: '古舊羅盤', icon: '🧭', rarity: 'rare',
    slot: 'tool', baseStats: { luck: { min: 4, max: 7 }, insight: { min: 2, max: 4 } },
    flavor: '指針不指向南方，而是指向你最需要去的地方——前提是你知道如何使用它。',
    obtainFrom: '通用掉落', usefulIn: ['迷霧森林', '沉睡村莊'],
    sellPrice: 65
  },

  // ── Epic ──
  'soul_reaper': {
    id: 'soul_reaper', name: '噬魂者', icon: '💀', rarity: 'epic',
    slot: 'weapon', baseStats: { attack: { min: 25, max: 40 }, crit: { min: 0.08, max: 0.15 } },
    flavor: '由凝固的虛空鑄成，握在手中能感受到宇宙的低語。刀刃上流轉著吸收靈魂的暗光。',
    obtainFrom: '深淵遺跡', usefulIn: ['虛空之門'],
    sellPrice: 250
  },
  'time_hourglass': {
    id: 'time_hourglass', name: '時空沙漏', icon: '⏳', rarity: 'epic',
    slot: 'tool', baseStats: { insight: { min: 8, max: 12 }, survival: { min: 5, max: 8 } },
    flavor: '沙漏中的沙子不往下流，而是向上飄。使用它時，周圍的時間會變得...奇怪。',
    obtainFrom: '遺忘圖書館', usefulIn: [],
    sellPrice: 300
  },
  'dragon_scale': {
    id: 'dragon_scale', name: '龍鱗鎧', icon: '🐉', rarity: 'epic',
    slot: 'armor', baseStats: { defense: { min: 20, max: 32 }, survival: { min: 6, max: 10 } },
    flavor: '用真正龍族的鱗片打造的鎧甲。據說這條龍在臨終前將自己的力量融入了每一片鱗甲中。',
    obtainFrom: '沉睡村莊（隱藏）', usefulIn: ['深淵遺跡'],
    sellPrice: 350
  },
  'star_fragment': {
    id: 'star_fragment', name: '星辰碎片', icon: '⭐', rarity: 'epic',
    slot: 'accessory', baseStats: { allStats: { min: 3, max: 5 } },
    flavor: '一顆墜落的星辰碎片，仍在散發著微弱的光芒。靠近它時，你能感受到來自宇宙深處的共鳴。',
    obtainFrom: '迷霧森林（隱藏）', usefulIn: [],
    sellPrice: 280
  },

  // ── Legendary ──
  'eternal_dawn': {
    id: 'eternal_dawn', name: '永曙之劍', icon: '🌅', rarity: 'legendary',
    slot: 'weapon', baseStats: { attack: { min: 45, max: 70 }, crit: { min: 0.12, max: 0.20 }, heal: { min: 5, max: 10 } },
    flavor: '傳說在世界的盡頭，有一道永不消散的曙光。這把劍就是由那道曙光鑄造而成——它能驅散一切黑暗，包括人心中的恐懼。',
    obtainFrom: '虛空之門（TE）', usefulIn: ['深淵遺跡'],
    sellPrice: 1200
  },
  'void_crown': {
    id: 'void_crown', name: '虛空之冠', icon: '👑', rarity: 'legendary',
    slot: 'accessory', baseStats: { allStats: { min: 8, max: 12 }, luck: { min: 5, max: 8 } },
    flavor: '深淵意志的化身。戴上它的人將獲得窺視虛空的力量，但也會被虛空永遠注視。傳說中只有一位玩家曾經獲得過它。',
    obtainFrom: '深淵遺跡（TE）', usefulIn: ['虛空之門'],
    sellPrice: 1500
  },
  'book_of_fate': {
    id: 'book_of_fate', name: '命運之書', icon: '📖', rarity: 'legendary',
    slot: 'tool', baseStats: { insight: { min: 15, max: 20 }, puzzle: { min: 12, max: 18 } },
    flavor: '一本記載著所有可能性的書。每一頁都描繪著一個不同的世界線。據說讀完整本書的人，能夠改寫自己的命運。',
    obtainFrom: '遺忘圖書館（TE）', usefulIn: ['所有副本'],
    sellPrice: 1300
  },

  // ── Divine ──
  'aether_heart': {
    id: 'aether_heart', name: '乙太之心', icon: '💠', rarity: 'divine',
    slot: 'accessory', baseStats: { allStats: { min: 20, max: 30 }, heal: { min: 15, max: 25 }, luck: { min: 10, max: 15 } },
    flavor: '宇宙初開時的第一縷意識——萬物之源的碎片。戴著它的人不再是無限流的棋子，而是棋手。全服僅此一件。',
    obtainFrom: '？？？', usefulIn: ['所有副本'],
    sellPrice: 9999
  },
  'world_key': {
    id: 'world_key', name: '世界之鑰', icon: '🔮', rarity: 'divine',
    slot: 'key', baseStats: {},
    flavor: '這不是一把打開門的鑰匙，而是一把打開「世界」的鑰匙。持有者可以隨時離開任何副本——包括無限流本身。',
    obtainFrom: '？？？', usefulIn: ['所有副本'],
    sellPrice: 8888
  },
};

// ======== Stat Labels (shared across all pages) ========
const STAT_LABELS = {
  insight: '洞察力',
  survival: '生存力',
  combat: '戰鬥力',
  puzzle: '解謎力',
  luck: '運氣',
};

// ======== DOM Helpers (shared across all pages) ========
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function show(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'block';
}

function hide(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

// ======== 物品實例生成 ========
let _instanceCounter = 0;
function createItemInstance(templateId, statOverrides = {}) {
  const template = ITEM_TEMPLATES[templateId];
  if (!template) return null;
  _instanceCounter++;
  
  const stats = {};
  for (const [key, range] of Object.entries(template.baseStats)) {
    if (key === 'allStats') {
      for (const s of ['insight','survival','combat','puzzle','luck']) {
        stats[s] = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
      }
    } else {
      stats[key] = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
    }
  }
  
  return {
    instanceId: `inst_${Date.now()}_${_instanceCounter}`,
    templateId: template.id,
    name: template.name,
    icon: template.icon,
    rarity: template.rarity,
    slot: template.slot,
    stats: { ...stats, ...statOverrides },
    flavor: template.flavor,
    obtainFrom: template.obtainFrom,
    usefulIn: template.usefulIn,
    sellPrice: template.sellPrice,
    acquiredAt: new Date().toISOString()
  };
}

// ======== 掉落判定 ========
const DROP_CHANCE_PER_RUN = 0.30; // 30% per run

function shouldDropItem() {
  return Math.random() < DROP_CHANCE_PER_RUN;
}

function rollLoot() {
  if (!shouldDropItem()) return null;
  
  const rarity = rollRarity();
  // Get all templates of that rarity
  const candidates = Object.values(ITEM_TEMPLATES).filter(t => t.rarity === rarity);
  if (candidates.length === 0) return null;
  
  const template = candidates[Math.floor(Math.random() * candidates.length)];
  return createItemInstance(template.id);
}

// ======== 經驗值系統 ========
const EXP_PER_LEVEL = 100; // base
function expToLevel(level) {
  return Math.floor(EXP_PER_LEVEL * Math.pow(1.5, level - 1));
}
function calcLevel(exp) {
  let level = 1;
  let needed = expToLevel(1);
  while (exp >= needed) {
    level++;
    needed = expToLevel(level);
  }
  return level;
}

// ======== 每日體力系統 ========
const MAX_STAMINA = 100;
const STAMINA_PER_RUN = 20;
const FREE_RUNS_PER_DAY = 5;
const RECHARGE_SECONDS = 600; // 10 min per stamina

// ======== 初始玩家狀態 ========
function createDefaultPlayer(username = '冒險者', avatar = '🦉') {
  return {
    id: `player_${Date.now()}`,
    username,
    avatar,
    title: '初曙探索者',
    level: 1,
    exp: 0,
    currency: 0,
    stamina: MAX_STAMINA,
    maxStamina: MAX_STAMINA,
    lastRecharge: Date.now(),
    dailyRunsLeft: FREE_RUNS_PER_DAY,
    lastDailyReset: new Date().toISOString().split('T')[0],
    stats: { insight: 5, survival: 5, combat: 5, puzzle: 5, luck: 5 },
    statPoints: 0,  // earned from leveling up
    items: [],
    completedRuns: 0,
    teCount: 0,
    heCount: 0,
    beCount: 0,
    hiddenBranches: 0,
    achievements: ['初生之犢'],
    divineFound: false,
    divineAnnounced: false,
  };
}

// ======== 副本定義 ========
const DUNGEONS = [
  {
    id: 'sleeping_village',
    name: '沉睡村莊',
    tier: 'F',
    type: '探索',
    minLevel: 1,
    tags: ['village', 'sleep', 'curse'],
    description: '一個被奇怪睡意籠罩的偏遠村莊。村民們陷入無法醒來的沉睡，而你似乎是唯一不受影響的人。',
    teCondition: '發現並解除村莊下的遠古封印',
    heCondition: '喚醒足夠多的村民',
    beCondition: '被睡意吞噬'
  },
  {
    id: 'mist_forest',
    name: '迷霧森林',
    tier: 'E',
    type: '解謎',
    minLevel: 3,
    tags: ['forest', 'mist', 'ruins'],
    description: '一片終年被魔法濃霧籠罩的森林。據說森林深處隱藏著一座古老遺跡。',
    teCondition: '喚醒森林守護者，獲得傳承',
    heCondition: '找到出路逃離森林',
    beCondition: '在迷霧中迷失'
  },
  {
    id: 'forgotten_library',
    name: '遺忘圖書館',
    tier: 'D',
    type: '解謎',
    minLevel: 5,
    tags: ['library', 'knowledge', 'void'],
    description: '一座不在任何地圖上的古老圖書館。書架上的書籍以未知語言書寫，散發著藍色光芒。',
    teCondition: '閱讀禁書區的創世記錄，了解世界真相',
    heCondition: '找到圖書館的出口',
    beCondition: '被書中知識吞噬意識'
  },
  {
    id: 'blood_moon_theater',
    name: '血月劇院',
    tier: 'C',
    type: '規則怪談',
    minLevel: 8,
    tags: ['theater', 'rules', 'performance'],
    description: '一座只在血月之夜出現的維多利亞風格劇院。你被分配到一個角色，必須按照劇本演出。',
    teCondition: '揭穿劇院本身就是活着的生命體，與其達成共生',
    heCondition: '完成整場演出而不違反規則',
    beCondition: '違反劇院規則，成為舞台的一部分'
  },
  {
    id: 'void_gate',
    name: '虛空之門',
    tier: 'B',
    type: '戰鬥',
    minLevel: 12,
    tags: ['void', 'gate', 'cosmic'],
    description: '一道通往虛空的裂縫出現在現實世界中。你被選中進入其中，面對虛空中潛藏的恐怖存在。',
    teCondition: '封印虛空裂縫，並理解虛空的真相',
    heCondition: '擊退虛空生物，關閉裂縫',
    beCondition: '被虛空吞噬'
  },
  {
    id: 'abyss_ruins',
    name: '深淵遺跡',
    tier: 'A',
    type: '混合',
    minLevel: 18,
    tags: ['abyss', 'ruins', 'ancient'],
    description: '遠古文明在深淵中建造的最後堡壘。這裡埋藏著無限流世界最深的秘密。',
    teCondition: '解開深淵文明的終極謎題，改變無限流本質',
    heCondition: '從深淵中帶回關鍵的古代遺物',
    beCondition: '成為深淵的一部分'
  },
];
