import type { Mood } from "../types/journal";

export type SceneContext = {
  scene: string;
  activity: string;
  action: string;
  expression: string;
  clothingHint: string;
  atmosphere: string;
};

// Scene keywords mapping
const SCENE_KEYWORDS: Record<string, string> = {
  "咖啡店": "咖啡店",
  "咖啡馆": "咖啡店",
  "cafe": "咖啡店",
  "公园": "公园",
  "花园": "公园",
  "街头": "街头",
  "街道": "街头",
  "家里": "家里",
  "家": "家里",
  "房间": "室内",
  "室内": "室内",
  "办公室": "办公室",
  "公司": "办公室",
  "餐厅": "餐厅",
  "书店": "书店",
  "图书馆": "图书馆",
  "海边": "海边",
  "沙滩": "海边",
  "山": "户外",
  "户外": "户外",
  "雨天": "室内",
  "下雨": "室内",
  "雪天": "室内",
};

// Activity keywords
const ACTIVITY_KEYWORDS: Record<string, string> = {
  "读书": "阅读",
  "看书": "阅读",
  "学习": "学习",
  "工作": "工作",
  "写日记": "写作",
  "写作": "写作",
  "散步": "散步",
  "走路": "散步",
  "跑步": "运动",
  "运动": "运动",
  "吃饭": "用餐",
  "用餐": "用餐",
  "喝茶": "品茶",
  "喝咖啡": "品咖啡",
  "听音乐": "听音乐",
  "听歌": "听音乐",
  "看电影": "观影",
  "睡觉": "休息",
  "午睡": "休息",
  "休息": "休息",
};

// Action keywords
const ACTION_KEYWORDS: Record<string, string> = {
  "想着": "沉思",
  "想": "思考",
  "思考": "沉思",
  "发呆": "发呆",
  "发呆中": "发呆",
  "聊天": "交谈",
  "说话": "交谈",
  "微笑": "微笑",
  "笑": "微笑",
  "哭": "哭泣",
  "流泪": "哭泣",
  "呼吸": "感受",
  "感受": "感受",
};

// Atmosphere keywords
const ATMOSPHERE_KEYWORDS: Record<string, string> = {
  "阳光": "明亮",
  "晴天": "明亮",
  "雨天": "宁静",
  "下雨": "宁静",
  "晚上": "温馨",
  "夜晚": "温馨",
  "早上": "清新",
  "早晨": "清新",
  "午后": "慵懒",
  "下午": "慵懒",
  "安静": "宁静",
  "热闹": "热闹",
};

// Mood-based default atmospheres
const MOOD_ATMOSPHERE_DEFAULTS: Record<Mood, string> = {
  "开心": "温馨",
  "想念": "温柔",
  "感动": "深情",
  "平静": "宁静",
  "调皮": "俏皮",
};

// Mood-based default scenes
const MOOD_SCENE_DEFAULTS: Record<Mood, string> = {
  "开心": "咖啡店",
  "想念": "公园",
  "感动": "室内",
  "平静": "室内",
  "调皮": "街头",
};

// Expression keywords
const EXPRESSION_KEYWORDS: Record<string, string> = {
  "笑": "微笑",
  "微笑": "微笑",
  "开心": "愉悦",
  "快乐": "愉悦",
  "幸福": "幸福",
  "想念": "思念",
  "想着": "思念",
  "发呆": "出神",
  "思考": "沉思",
  "哭": "泪光",
  "流泪": "泪光",
  "感动": "动容",
  "平静": "宁静",
  "安静": "宁静",
  "生气": "微怒",
  "调皮": "俏皮",
};

// Mood-based default expressions
const MOOD_EXPRESSION_DEFAULTS: Record<Mood, string> = {
  "开心": "愉悦",
  "想念": "思念",
  "感动": "动容",
  "平静": "宁静",
  "调皮": "俏皮",
};

// Simple hash function for stable clothing hints
function simpleHash(content: string, mood: Mood): number {
  let hash = 0;
  const str = content + mood;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Clothing hint combinations based on content hash and mood
const CLOTHING_ADJECTIVES = ["温柔", "休闲", "文艺", "清新", "慵懒", "优雅", "舒适", "简约"];
const CLOTHING_NOUNS = ["连衣裙", "毛衣", "T恤", "衬衫", "外套", "针织衫", "裙装", "套装"];

function deriveClothingHint(content: string, mood: Mood): string {
  const hash = simpleHash(content, mood);
  const adjIndex = hash % CLOTHING_ADJECTIVES.length;
  const nounIndex = (hash >> 3) % CLOTHING_NOUNS.length;
  return CLOTHING_ADJECTIVES[adjIndex] + CLOTHING_NOUNS[nounIndex];
}

function findKeyword(text: string, keywordMap: Record<string, string>): string | null {
  for (const keyword of Object.keys(keywordMap)) {
    if (text.includes(keyword)) {
      return keywordMap[keyword];
    }
  }
  return null;
}

function deriveScene(content: string, mood: Mood): string {
  // First try to find explicit scene keywords
  const foundScene = findKeyword(content, SCENE_KEYWORDS);
  if (foundScene) return foundScene;

  // Fall back to mood-based default
  return MOOD_SCENE_DEFAULTS[mood];
}

function deriveActivity(content: string): string {
  const foundActivity = findKeyword(content, ACTIVITY_KEYWORDS);
  if (foundActivity) return foundActivity;

  // Default activity based on content length (heuristic)
  if (content.length < 20) return "思考";
  return "日常";
}

function deriveAction(content: string): string {
  const foundAction = findKeyword(content, ACTION_KEYWORDS);
  if (foundAction) return foundAction;

  return "存在";
}

function deriveAtmosphere(content: string, mood: Mood): string {
  const foundAtmosphere = findKeyword(content, ATMOSPHERE_KEYWORDS);
  if (foundAtmosphere) return foundAtmosphere;

  return MOOD_ATMOSPHERE_DEFAULTS[mood];
}

function deriveExpression(content: string, mood: Mood): string {
  const foundExpression = findKeyword(content, EXPRESSION_KEYWORDS);
  if (foundExpression) return foundExpression;

  return MOOD_EXPRESSION_DEFAULTS[mood];
}

export function extractSceneContext(
  content: string,
  mood: Mood,
  _date: string
): SceneContext {
  return {
    scene: deriveScene(content, mood),
    activity: deriveActivity(content),
    action: deriveAction(content),
    expression: deriveExpression(content, mood),
    clothingHint: deriveClothingHint(content, mood),
    atmosphere: deriveAtmosphere(content, mood),
  };
}