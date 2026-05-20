import type { Mood } from "../../types/journal";
import type { MoodVariant } from "./moodVariants";

// 开场白模板
const openerTemplates: Record<string, string[]> = {
  "雀跃": [
    "今天心情特别好，蹦蹦跳跳的那种。",
    "想到一些事情，忍不住就笑了起来。",
    "我今天特别开心，你知道为什么吗？",
  ],
  "满足": [
    "此刻感觉特别满足，平静而踏实。",
    "现在这样就很好，简单又温暖。",
    "我在想，生活这样就够了。",
  ],
  "傻乐": [
    "我也不知道为什么，但就是很开心。",
    "刚才想到什么事情，自己傻笑了好久。",
    "哈哈，没什么，就是想笑。",
  ],
  "淡淡的": [
    "今天有点想你，淡淡的。",
    "有些想念，藏在心里很轻。",
    "想你的时候，空气都温柔了一点。",
  ],
  "浓烈的": [
    "我很想你，想得很强烈。",
    "今天对你的思念特别深，你在哪里呀？",
    "这种感觉，只有你在我心里才懂。",
  ],
  "撒娇的": [
    "你不在的时候，我有点想撒娇。",
    "想你的时候，我就想赖着你。",
    "今天格外想你，想让你抱抱我。",
  ],
  "温暖的": [
    "刚才想起一些事情，心里暖暖的。",
    "这份感动，慢慢地流进心里。",
    "有些温柔，是会慢慢沉下来的。",
  ],
  "哽咽的": [
    "我眼睛有点湿润，说不清为什么。",
    "这份感动让我有点说不出话来。",
    "不知道为什么，今天特别想哭。",
  ],
  "释然的": [
    "有些事情想通了，心里轻松了很多。",
    "终于放下了，感觉真好。",
    "这一刻，一切都值得了。",
  ],
  "慵懒的": [
    "今天什么都不想做，就这样懒懒的。",
    "阳光很好，我什么都不想。",
    "慢悠悠地，什么都不着急。",
  ],
  "内敛的": [
    "今天想安静地待一会儿。",
    "有些事情，放在心里就好。",
    "今天的我，向内的。",
  ],
  "清澈的": [
    "今天心很静，像一潭清水。",
    "一切都很清澈，透亮的。",
    "这种清明的感觉，很舒服。",
  ],
  "得意的": [
    "哈哈，我今天可得意了。",
    "偷偷得意一下，不告诉你为什么。",
    "想想就觉得美滋滋的。",
  ],
  "恶作剧的": [
    "我有个小坏主意，不知道该不该说。",
    "嘻嘻，等着看我做什么吧。",
    "嘿嘿嘿，今天我要调皮一下。",
  ],
  "撒娇的调皮": [
    "哼，我今天要撒娇，你能拿我怎么样？",
    "我就调皮一下下嘛，不许生气哦。",
    "撒娇和调皮，我今天都要。",
  ],
};

// 记忆钩子模板
const memoryHookTemplates = [
  "记得吗？那时候你说...",
  "想起上次我们...",
  "翻到以前，发现那时候...",
  "记忆里，你...",
];

// 结尾模板
const endingTemplates: Record<string, string[]> = {
  "开心": [
    "希望你今天也开心。",
    "好心情要分享给你。",
    "想想你，嘴角就忍不住上扬。",
  ],
  "想念": [
    "我在想你，你感觉到了吗？",
    "不管你在哪里，我都在想你。",
    "想见你，想现在就见到你。",
  ],
  "感动": [
    "谢谢你，一直都在。",
    "有你在，真好。",
    "感动的事情很多，但有你最重要。",
  ],
  "平静": [
    "就这样静静地，也很好。",
    "希望你也能平静。",
    "慢一点，没关系的。",
  ],
  "调皮": [
    "好啦，就调皮到这里。",
    "我去想想下次怎么调皮你。",
    "哼，今天就放过你。",
  ],
};

// 日期提示语
const dateHintTemplates: Record<string, string> = {
  "放假的轻松感": "放假的感觉真好，整个人都轻松了。",
  "甜蜜的暗示": "今天是个特别的日子，有话想对你说。",
  "童心未泯": "做个小朋友也很不错呀。",
  "浪漫的时刻": "这种日子，总让人想到浪漫的事情。",
  "新年的开始": "新的一年，新的开始呢。",
  "爱意满满": "爱要大声说出来，今天特别想说。",
  "新一周的开始": "新的一周开始了，一起加油吧。",
};

export function getOpener(variant: MoodVariant): string {
  const templates = openerTemplates[variant.tag] ?? openerTemplates["傻乐"];
  return templates[Math.floor(Math.random() * templates.length)];
}

export function getEnding(mood: Mood): string {
  const templates = endingTemplates[mood] ?? endingTemplates["开心"];
  return templates[Math.floor(Math.random() * templates.length)];
}

export function getMemoryHook(): string {
  return memoryHookTemplates[Math.floor(Math.random() * memoryHookTemplates.length)];
}

export function getDateHint(contentHint?: string): string {
  if (!contentHint) return "";
  return dateHintTemplates[contentHint] ?? "";
}