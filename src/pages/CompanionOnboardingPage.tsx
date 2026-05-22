import { useState } from "react";
import { initializeCompanionOnboarding } from "../services/api/companionClient";
import type { InitialCompanionResult } from "../types/companion";
import { OnboardingPrompt } from "../components/companion/OnboardingPrompt";
import { getCurrentUserId } from "../services/memory";
import { COMPANION_ONBOARDING_PROMPTS, generateRevealPortrait } from "../services/companion";

const prompts = COMPANION_ONBOARDING_PROMPTS;

type Stage = "onboarding" | "generating" | "reveal";

type Props = {
  onCompleted: (result: InitialCompanionResult) => void;
};

export function CompanionOnboardingPage({ onCompleted }: Props) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<{ questionKey: string; answerValue: string }>>([]);
  const [stage, setStage] = useState<Stage>("onboarding");
  const [result, setResult] = useState<InitialCompanionResult | null>(null);

  const current = prompts[index];

  async function handleSelect(answerValue: string) {
    const nextAnswers = [...answers, { questionKey: current.questionKey, answerValue }];

    if (index === prompts.length - 1) {
      setStage("generating");
      const onboardingResult = await initializeCompanionOnboarding({
        userId: getCurrentUserId(),
        answers: nextAnswers,
      });
      const portraitImageUrl = await generateRevealPortrait(onboardingResult.reveal.appearancePrompt);
      const hydratedResult = {
        ...onboardingResult,
        reveal: {
          ...onboardingResult.reveal,
          portraitImageUrl,
        },
      };
      setResult(hydratedResult);
      setStage("reveal");
      onCompleted(hydratedResult);
      return;
    }

    setAnswers(nextAnswers);
    setIndex((value) => value + 1);
  }

  if (stage === "generating") {
    return <div>Generating your companion...</div>;
  }

  if (stage === "reveal" && result) {
    return (
      <div>
        <h2>{result.reveal.displayName}</h2>
        <img src={result.reveal.portraitImageUrl ?? undefined} alt="岚夕立绘" />
        <p>{result.reveal.tagline}</p>
      </div>
    );
  }

  return <OnboardingPrompt prompt={current.prompt} options={current.options} onSelect={handleSelect} />;
}
