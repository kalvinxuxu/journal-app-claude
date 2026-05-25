export const COMPANION_INTAKE_CONFIG = {
  title: "先从你开始",
  subtitle: "她不会凭空出现。她会先经过你，再慢慢成形。",
  entryModes: [
    { label: "更像真实世界里会遇见的人", value: "real" },
    { label: "保留一点梦感和距离", value: "fantasy" },
  ],
} as const;

export const ABOUT_YOU_QUESTIONS = [
  {
    questionKey: "social_energy",
    prompt: "在大多数关系里，你更像哪一种人？",
    options: [
      { label: "慢热，但熟了以后会很深", value: "slow_warm" },
      { label: "比较外放，先靠近再看感觉", value: "open_outward" },
      { label: "看场合，不会轻易一下子打开", value: "guarded_balanced" },
    ],
  },
  {
    questionKey: "emotional_texture",
    prompt: "你更容易被哪种东西打动？",
    options: [
      { label: "感受会留得比较久", value: "sensitive_deep" },
      { label: "当下的反应比较快", value: "reactive_quick" },
      { label: "会先分析，冷静下来才有感觉", value: "analytical_calm" },
    ],
  },
  {
    questionKey: "expression_style",
    prompt: "你更习惯怎么表达？",
    options: [
      { label: "先收着，不会立刻说很多", value: "restrained" },
      { label: "会说，但不会一次性倒出来", value: "measured" },
      { label: "比较自然，想到就说", value: "spontaneous" },
    ],
  },
];

export const ABOUT_HER_QUESTIONS = [
  {
    questionKey: "temperament",
    prompt: "你希望她更接近哪种气质？",
    options: [
      { label: "稳一点，像很难被轻易晃动的人", value: "mature_steady" },
      { label: "柔和，但有自己的方向", value: "gentle_grounded" },
      { label: "灵动，不那么可以被预测", value: "vivid_unpredictable" },
    ],
  },
  {
    questionKey: "affection_style",
    prompt: "你希望她怎么表达在意？",
    options: [
      { label: "会照顾人，但不会用力过猛", value: "gentle_attentive" },
      { label: "会直接一点，不绕圈子", value: "direct_solid" },
      { label: "用行动而不是语言", value: "action_first" },
    ],
  },
  {
    questionKey: "distance_style",
    prompt: "你prefer她保持怎样的距离感？",
    options: [
      { label: "有边界，但不是冷", value: "poised" },
      { label: "比较亲近，像认识很久", value: "familiar_warm" },
      { label: "保持一点神秘感", value: "enigmatic" },
    ],
  },
  {
    questionKey: "initiative_style",
    prompt: "你prefer她主动的程度？",
    options: [
      { label: "会往前一步，但懂得停", value: "measured_forward" },
      { label: "大多数时候让你先来", value: "receptive" },
      { label: "会更主动一点", value: "active_forward" },
    ],
  },
  {
    questionKey: "expression_tone",
    prompt: "你prefer她的表达风格？",
    options: [
      { label: "偶尔有一点傲气", value: "light_proud" },
      { label: "温和，很少强势", value: "soft_humble" },
      { label: "直接，但带着温度", value: "direct_warm" },
    ],
  },
  {
    questionKey: "hair_style",
    prompt: "你prefer她的发型？",
    options: [
      { label: "长发", value: "long_hair" },
      { label: "短发或中长发", value: "short_medium" },
      { label: "盘发或束发", value: "updo" },
    ],
  },
  {
    questionKey: "body_presence",
    prompt: "你prefer她的整体存在感？",
    options: [
      { label: "匀称、成熟一点的存在感", value: "balanced_mature" },
      { label: "轻盈、灵巧一点", value: "light_agile" },
      { label: "舒展、放松的状态", value: "relaxed_expansive" },
    ],
  },
  {
    questionKey: "fashion_aura",
    prompt: "你更想看她擅长哪种穿搭风格？",
    options: [
      { label: "老钱风", value: "old_money" },
      { label: "松弛极简风", value: "relaxed_minimal" },
      { label: "Y2K千禧风", value: "y2k_playful" },
      { label: "甜妹风", value: "sweet_girly" },
    ],
  },
];
