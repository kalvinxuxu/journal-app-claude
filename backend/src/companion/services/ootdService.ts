import type { OotdRecord } from "../types";

const OOTD_PROMPTS = [
  "今天想穿一件温柔的米色针织开衫，搭配浅蓝色牛仔裤，简单又舒适",
  "今天想穿一条碎花裙，配白色小皮鞋，有点小清新的感觉",
  "今天想穿一件简单的白T恤，配高腰阔腿裤，干练利落",
  "今天想穿一件淡粉色的衬衫裙，轻盈又有气质",
  "今天想穿一件宽松的卫衣，配小黑裤，休闲又自在",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export type OotdGenerationResult = {
  imageUrl: string | null;
  title: string;
  caption: string;
  rationale: string | null;
  styleTags: string[];
};

export type OotdGeneratorDeps = {
  port: number;
  generateImage: (opts: { prompt: string; aspectRatio: string; subjectReference?: string }) => Promise<string | null>;
};

export function createOotdGenerator(deps: OotdGeneratorDeps) {
  return async function generateOotd(userId: string, date: string): Promise<OotdGenerationResult> {
    const prompt = pickRandom(OOTD_PROMPTS);
    const title = "今日穿搭";
    const caption = "这是她今天想穿的";

    // Generate outfit image with portrait-style aspect ratio
    let imageUrl: string | null = null;
    try {
      imageUrl = await deps.generateImage({
        prompt,
        aspectRatio: "3:4",
      });
    } catch (err) {
      console.warn("[ootdGenerator] Image generation failed:", err);
    }

    return {
      imageUrl,
      title,
      caption,
      rationale: null,
      styleTags: [],
    };
  };
}