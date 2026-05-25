import { useState } from "react";
import { initializeCompanionOnboarding, persistCompanionRevealPortrait, saveCompanionCustomName } from "../services/api/companionClient";
import type { InitialCompanionResult } from "../types/companion";
import { OnboardingPrompt } from "../components/companion/OnboardingPrompt";
import { getCurrentUserId } from "../services/memory";
import { COMPANION_INTAKE_CONFIG, ABOUT_YOU_QUESTIONS, ABOUT_HER_QUESTIONS } from "../services/companion/onboardingQuestions";
import { generateRevealPortrait } from "../services/companion";

type Stage = "intake" | "about-you" | "about-her" | "generating" | "reveal" | "naming";

type AnswerRecord = { questionKey: string; answerValue: string };

const APPEARANCE_BULLETS: Record<string, string> = {
  long_hair: "长发，更亲近",
  short_medium: "短发或中长发，更轻",
  updo: "束发，更利落",
  balanced_mature: "稳，存在感刚好",
  light_agile: "轻一点，也灵一点",
  relaxed_expansive: "更放松，也更自然",
};

const PERSONALITY_BULLETS: Record<string, string> = {
  mature_steady: "稳，不会轻易晃动",
  gentle_grounded: "柔和，也有主见",
  vivid_unpredictable: "灵一点，不木",
  gentle_attentive: "会照顾人，不会太满",
  direct_solid: "说话直接，不绕",
  action_first: "更会用行动靠近",
  poised: "有边界，但不冷",
  familiar_warm: "亲近，熟得很快",
  enigmatic: "留一点神秘感",
  measured_forward: "会靠近，也会停",
  receptive: "更愿意等你开口",
  active_forward: "主动感更明显",
  light_proud: "会有一点小傲气",
  soft_humble: "温和，不抢",
  direct_warm: "直接，也有温度",
};

function buildRevealBullets(result: InitialCompanionResult) {
  return [
    PERSONALITY_BULLETS[result.reveal.personalityProfile.temperament],
    PERSONALITY_BULLETS[result.reveal.personalityProfile.affectionStyle],
    PERSONALITY_BULLETS[result.reveal.personalityProfile.distanceStyle],
    APPEARANCE_BULLETS[result.reveal.appearanceProfile.hairStyle],
  ].filter(Boolean);
}

type Props = {
  onCompleted: (result: InitialCompanionResult) => void;
};

export function CompanionOnboardingPage({ onCompleted }: Props) {
  const [stage, setStage] = useState<Stage>("intake");
  const [entryMode, setEntryMode] = useState<"real" | "fantasy" | null>(null);
  const [aboutYouIndex, setAboutYouIndex] = useState(0);
  const [aboutYouAnswers, setAboutYouAnswers] = useState<AnswerRecord[]>([]);
  const [aboutHerIndex, setAboutHerIndex] = useState(0);
  const [aboutHerAnswers, setAboutHerAnswers] = useState<AnswerRecord[]>([]);
  const [customName, setCustomName] = useState("");
  const [result, setResult] = useState<InitialCompanionResult | null>(null);

  // --- Intake stage ---
  if (stage === "intake") {
    return (
      <section className="companion-onboarding companion-onboarding--intake">
        <div className="companion-onboarding__panel">
          <p className="section-label">先从你开始</p>
          <h2>{COMPANION_INTAKE_CONFIG.title}</h2>
          <p className="hero-copy">{COMPANION_INTAKE_CONFIG.subtitle}</p>
          <div className="dream-prompt__options dream-prompt__options--intake">
            {COMPANION_INTAKE_CONFIG.entryModes.map((mode) => (
              <button
                key={mode.value}
                type="button"
                className="onboarding-option onboarding-option--intake"
                onClick={() => {
                  setEntryMode(mode.value as "real" | "fantasy");
                  setStage("about-you");
                }}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // --- About-you stage ---
  if (stage === "about-you") {
    const current = ABOUT_YOU_QUESTIONS[aboutYouIndex];
    const isLast = aboutYouIndex === ABOUT_YOU_QUESTIONS.length - 1;

    function handleSelect(answerValue: string) {
      const nextAnswers = [...aboutYouAnswers, { questionKey: current.questionKey, answerValue }];
      setAboutYouAnswers(nextAnswers);

      if (isLast) {
        setAboutHerIndex(0);
        setStage("about-her");
      } else {
        setAboutYouIndex((v) => v + 1);
      }
    }

    return <OnboardingPrompt prompt={current.prompt} options={current.options} onSelect={handleSelect} />;
  }

  // --- About-her stage ---
  if (stage === "about-her") {
    const current = ABOUT_HER_QUESTIONS[aboutHerIndex];
    const isLast = aboutHerIndex === ABOUT_HER_QUESTIONS.length - 1;

    function handleSelect(answerValue: string) {
      const nextAnswers = [...aboutHerAnswers, { questionKey: current.questionKey, answerValue }];
      setAboutHerAnswers(nextAnswers);

      if (isLast) {
        setStage("generating");
        runOnboarding(nextAnswers);
      } else {
        setAboutHerIndex((v) => v + 1);
      }
    }

    return <OnboardingPrompt prompt={current.prompt} options={current.options} onSelect={handleSelect} />;
  }

  // --- Generating stage ---
  if (stage === "generating") {
    return (
      <section className="companion-onboarding companion-onboarding--generating">
        <div className="companion-onboarding__panel">
          <p className="section-label">匹配进行中</p>
          <h2>她正在慢慢成形</h2>
          <p className="hero-copy">我们正在把你的回答拼成一个真正会靠近你的人。</p>
        </div>
      </section>
    );
  }

  // --- Reveal stage ---
  if (stage === "reveal" && result) {
    const revealBullets = buildRevealBullets(result);
    return (
      <section className="companion-onboarding companion-onboarding--reveal">
        <div className="companion-reveal card">
          <div className="companion-reveal__figure" aria-label="她的立绘">
            <img
              src={result.reveal.portraitImageUrl ?? ""}
              alt="她的立绘"
              className="companion-reveal__image"
            />
          </div>
          <div className="companion-reveal__content">
            <p className="section-label">她来到你这里</p>
            <h2>她</h2>
            <p className="companion-reveal__tagline">{result.reveal.tagline}</p>
            <p className="companion-reveal__description">{result.reveal.portraitDescription}</p>
            {revealBullets.length > 0 ? (
              <ul className="companion-reveal__bullets">
                {revealBullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
            <p className="companion-reveal__match">{result.reveal.matchExplanation}</p>
            <button
              type="button"
              className="primary-button"
              onClick={() => setStage("naming")}
            >
              继续
            </button>
          </div>
        </div>
      </section>
    );
  }

  // --- Naming stage ---
  if (stage === "naming" && result) {
    async function handleConfirmName() {
      if (!customName.trim()) return;

      await saveCompanionCustomName({
        userId: getCurrentUserId(),
        customName: customName.trim(),
      });

      const namedResult = {
        ...result,
        reveal: {
          ...result.reveal,
          customName: customName.trim(),
        },
      };

      setResult(namedResult);
      onCompleted(namedResult);
    }

    return (
      <section className="companion-onboarding companion-onboarding--naming">
        <div className="companion-onboarding__panel">
          <p className="section-label">现在，你可以正式叫她了</p>
          <h2>她</h2>
          <p className="hero-copy">名字由你来定。等你叫她的时候，这段关系才算真的开始。</p>
          <input
            className="companion-name-input"
            value={customName}
            onChange={(event) => setCustomName(event.target.value)}
            placeholder="你想怎么叫她"
          />
          <button type="button" className="primary-button" onClick={handleConfirmName}>
            就这样叫她
          </button>
        </div>
      </section>
    );
  }

  // Fallback — should not reach here
  return null;

  // --- Shared helper ---
  async function runOnboarding(herAnswers: AnswerRecord[]) {
    try {
      const onboardingResult = await initializeCompanionOnboarding({
        userId: getCurrentUserId(),
        intake: { entryMode: entryMode ?? "real" },
        userProfileAnswers: aboutYouAnswers,
        companionPreferenceAnswers: herAnswers,
      });

      let portraitImageUrl: string | null = null;
      try {
        portraitImageUrl = await generateRevealPortrait(onboardingResult.reveal.appearancePrompt);
        await persistCompanionRevealPortrait({
          userId: getCurrentUserId(),
          portraitImageUrl,
        });
      } catch (portraitError) {
        console.error("Failed to generate reveal portrait:", portraitError);
      }

      const hydratedResult = {
        ...onboardingResult,
        reveal: {
          ...onboardingResult.reveal,
          portraitImageUrl,
        },
      };

      setResult(hydratedResult);
      setStage("reveal");
    } catch (err) {
      console.error("Failed to generate companion:", err);
      // Reset to about-her last question on failure
      setAboutHerIndex(ABOUT_HER_QUESTIONS.length - 1);
      setStage("about-her");
    }
  }
}
