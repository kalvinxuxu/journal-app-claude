import type { OotdRecord, OotdCardKind, OotdCard } from "../types";

const OOTD_PROMPTS = [
  "今天想穿一件温柔的米色针织开衫，搭配浅蓝色牛仔裤，简单又舒适",
  "今天想穿一条碎花裙，配白色小皮鞋，有点小清新的感觉",
  "今天想穿一件简单的白T恤，配高腰阔腿裤，干练利落",
  "今天想穿一件淡粉色的衬衫裙，轻盈又有气质",
  "今天想穿一件宽松的卫衣，配小黑裤，休闲又自在",
];

function buildFullBodySelfiePrompt(outfitPrompt: string, fashionAura?: string, poseTag?: string) {
  const fashionAuraPrompt = fashionAura ? (FASHION_AURA_PROMPTS[fashionAura] ?? fashionAura) : undefined;
  return [
    "Young East Asian woman with a warm approachable girlfriend vibe.",
    "Xiaohongshu fashion blogger styling reference, polished and trend-aware.",
    "Full-body mirror selfie or obvious phone-camera self-shot.",
    "Head-to-toe visible, complete outfit clearly shown, shoes and accessories included.",
    "Pose should read clearly as cute, sexy, or elegant.",
    poseTag ? `Preferred pose mood: ${poseTag}.` : "",
    "Only one young woman in the image.",
    fashionAuraPrompt ? `Her styling aura should feel ${fashionAuraPrompt}.` : "",
    outfitPrompt,
  ].filter(Boolean).join(" ");
}

function buildMakeupCloseupPrompt(outfitPrompt: string, fashionAura?: string) {
  const fashionAuraPrompt = fashionAura ? (FASHION_AURA_PROMPTS[fashionAura] ?? fashionAura) : undefined;
  return [
    "Young East Asian woman with a warm approachable girlfriend vibe.",
    "makeup close-up selfie with polished Xiaohongshu beauty blogger composition.",
    "same girl and same outfit continuity as today's full-body OOTD selfie.",
    "Focus on makeup, hair, earrings, necklace, neckline, and upper-body outfit detail.",
    "Only one young woman in the image.",
    fashionAuraPrompt ? `Her styling aura should feel ${fashionAuraPrompt}.` : "",
    outfitPrompt,
  ].filter(Boolean).join(" ");
}

const FASHION_AURA_PROMPTS: Record<string, string> = {
  old_money: "low-key luxury, polished, understated, premium old-money styling",
  relaxed_minimal: "relaxed, minimal, effortless, comfortable-but-stylish dressing",
  y2k_playful: "playful Y2K styling with a stylish retro 2000s mood",
  sweet_girly: "sweet, pretty, softly feminine styling",
  stylish_refined: "refined, fashion-forward, polished styling",
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildOotdImagePrompt(outfitPrompt: string, fashionAura?: string) {
  const fashionAuraPrompt = fashionAura ? (FASHION_AURA_PROMPTS[fashionAura] ?? fashionAura) : undefined;
  return [
    "Young East Asian woman with a warm approachable girlfriend vibe.",
    "She understands refined styling and knows how to dress well.",
    "Her outfit should feel fashionable, polished, eye-catching, and pleasing to look at.",
    "She dresses to please herself and also be visually attractive to the person who sees her.",
    fashionAuraPrompt ? `Her styling aura should feel ${fashionAuraPrompt}.` : "",
    "Only one young woman in the image.",
    "Do not show two women, duplicate versions of the same woman, mirrored people, twins, a crowd, or a group photo.",
    "Full-body fashion photo, head-to-toe fully visible, complete outfit clearly shown.",
    "Show a stylish and flattering silhouette with clear outfit coordination and fashion appeal.",
    "Relaxed standing pose or natural candid motion: slight side turn, looking back, one hand in pocket, or an easy walking step.",
    "Avoid stiff attention pose, rigid symmetry, or mannequin posture.",
    "Use a phone camera eye-level or slightly top-down angle.",
    "Daily-life outfit photo, not a product flat lay, not a clothing-only crop, not a catalog mannequin shot, not a corporate ad.",
    "Realistic lifestyle photography, soft natural light, clean background, visually pleasing and fresh.",
    outfitPrompt,
  ].filter(Boolean).join(" ");
}

export type OotdGenerationResult = {
  cards: OotdCard[];
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
  return async function generateOotd(
    userId: string,
    date: string,
    subjectReference?: string,
    fashionAura?: string,
  ): Promise<OotdGenerationResult> {
    const outfitPrompt = pickRandom(OOTD_PROMPTS);
    const poseTag: "cute" | "sexy" | "elegant" = pickRandom(["cute", "sexy", "elegant"]);

    const fullbodyPrompt = buildFullBodySelfiePrompt(outfitPrompt, fashionAura, poseTag);
    const makeupPrompt = buildMakeupCloseupPrompt(outfitPrompt, fashionAura);

    const title = "今日穿搭";
    const caption = "她知道怎么把自己穿得更好看。";

    // Generate two images in parallel
    let fullbodyImageUrl: string | null = null;
    let makeupImageUrl: string | null = null;

    try {
      [fullbodyImageUrl, makeupImageUrl] = await Promise.all([
        deps.generateImage({ prompt: fullbodyPrompt, aspectRatio: "9:16", subjectReference }),
        deps.generateImage({ prompt: makeupPrompt, aspectRatio: "9:16", subjectReference }),
      ]);
    } catch (err) {
      console.warn("[ootdGenerator] Image generation failed:", err);
    }

    const cards: OotdCard[] = [
      {
        id: `${date}-fullbody`,
        kind: "fullbody_selfie",
        imageUrl: fullbodyImageUrl,
        caption: null,
        poseTag,
        liked: false,
      },
      {
        id: `${date}-makeup`,
        kind: "makeup_closeup",
        imageUrl: makeupImageUrl,
        caption: null,
        liked: false,
      },
    ];

    return {
      cards,
      title,
      caption,
      rationale: null,
      styleTags: ["精致穿搭", "时尚感", "养眼"],
    };
  };
}
