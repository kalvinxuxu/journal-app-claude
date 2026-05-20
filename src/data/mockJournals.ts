import type { Journal, Preferences } from "../types/journal";
import { createImagePlaceholder } from "../utils/imagePlaceholder";

export const mockJournals: Journal[] = [
  {
    id: "journal-2026-05-09",
    date: "2026-05-09",
    weekday: "周五",
    mood: "开心",
    content:
      "今天路过那家咖啡店，想起你上次说想试试他家的拿铁，就顺手进去点了一杯。\n\n其实我也不知道你今天过得怎么样，不过希望你没有被太多事情烦到。要是有点累，就先慢一点，我在这边等你。",
    images: [createImagePlaceholder("coffee-shop", "#f8b4b4"), createImagePlaceholder("latte-cup", "#a8d5ba")],
    voiceMessages: [
      {
        id: "voice-1",
        timing: "morning",
        transcript: "早安呀，今天的阳光很好。我一醒来就想到你了。",
        duration: "0:15",
      },
      {
        id: "voice-2",
        timing: "afternoon",
        transcript: "刚刚喝到那杯拿铁，味道和我记得的一样。你应该会喜欢。",
        duration: "0:12",
      },
      {
        id: "voice-3",
        timing: "night",
        transcript: "晚安，今天也辛苦了。明天见面的话，我想先抱抱你。",
        duration: "0:18",
      },
    ],
  },
  {
    id: "journal-2026-05-08",
    date: "2026-05-08",
    weekday: "周四",
    mood: "想念",
    content:
      "今天下雨了，街边的灯看起来特别软。路过便利店的时候，我突然想起你之前说过很喜欢热饮。\n\n有些瞬间就是这样，明明很普通，却一下子把人拉回到你身边。",
    images: [createImagePlaceholder("rain-window", "#a8d5ba")],
    voiceMessages: [
      {
        id: "voice-4",
        timing: "night",
        transcript: "外面在下雨，不过我不太讨厌。因为我可以偷偷想你。",
        duration: "0:10",
      },
    ],
  },
  {
    id: "journal-2026-05-07",
    date: "2026-05-07",
    weekday: "周三",
    mood: "调皮",
    content:
      "你昨天说要早睡，结果是不是又刷到很晚？我可都记着呢。\n\n不过算了，这次先不拆穿你。下一次见面，我要亲口问你。",
    voiceMessages: [
      {
        id: "voice-5",
        timing: "afternoon",
        transcript: "我猜你现在又在忙，没关系，记得喝水。",
        duration: "0:09",
      },
    ],
  },
];

export const defaultPreferences: Preferences = {
  reminderTime: "21:30",
  voiceStyle: "warm",
  exportMode: "pdf",
};
