import { useState } from "react";
import { initializeCompanionOnboarding, persistCompanionRevealPortrait, saveCompanionCustomName } from "../services/api/companionClient";
import type { InitialCompanionResult } from "../types/companion";
import { OnboardingPrompt } from "../components/companion/OnboardingPrompt";
import { getCurrentUserId } from "../services/memory";
import { COMPANION_INTAKE_CONFIG, ABOUT_YOU_QUESTIONS, ABOUT_HER_QUESTIONS } from "../services/companion/onboardingQuestions";
import { generateRevealPortrait } from "../services/companion";

type Stage = "intake" | "about-you" | "about-her" | "generating" | "reveal" | "naming";

type AnswerRecord = { questionKey: string; answerValue: string };

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
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "24px" }}>
            {COMPANION_INTAKE_CONFIG.entryModes.map((mode) => (
              <button
                key={mode.value}
                type="button"
                className="primary-button"
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
    return (
      <section className="companion-onboarding companion-onboarding--reveal">
        <div className="companion-reveal card">
          <div className="companion-reveal__figure" aria-label={result.reveal.systemDisplayName}>
            <img
              src={result.reveal.portraitImageUrl ?? ""}
              alt={`${result.reveal.systemDisplayName}立绘`}
              className="companion-reveal__image"
            />
          </div>
          <div className="companion-reveal__content">
            <p className="section-label">她来到你这里</p>
            <h2>{result.reveal.systemDisplayName}</h2>
            <p className="companion-reveal__tagline">{result.reveal.tagline}</p>
            <p>{result.reveal.portraitDescription}</p>
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
          <h2>{result.reveal.systemDisplayName}</h2>
          <input
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

      const portraitImageUrl = await generateRevealPortrait(onboardingResult.reveal.appearancePrompt);
      await persistCompanionRevealPortrait({
        userId: getCurrentUserId(),
        portraitImageUrl,
      });

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