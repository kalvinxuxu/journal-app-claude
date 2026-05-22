import { useState } from "react";
import { initializeCompanionOnboarding } from "../services/api/companionClient";
import type { InitialCompanionResult } from "../types/companion";
import { OnboardingPrompt } from "../components/companion/OnboardingPrompt";
import { getCurrentUserId } from "../services/memory";
import { COMPANION_ONBOARDING_PROMPTS, generateRevealPortrait } from "../services/companion";

const prompts = COMPANION_ONBOARDING_PROMPTS;

type Stage = "landing" | "questions" | "generating" | "reveal";

type Props = {
  onCompleted: (result: InitialCompanionResult) => void;
};

export function CompanionOnboardingPage({ onCompleted }: Props) {
  const [stage, setStage] = useState<Stage>("landing");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<{ questionKey: string; answerValue: string }>>([]);
  const [result, setResult] = useState<InitialCompanionResult | null>(null);

  const current = prompts[index];

  async function handleSelect(answerValue: string) {
    const currentPrompt = prompts[index];
    const nextAnswers = [...answers, { questionKey: currentPrompt.questionKey, answerValue }];

    if (index < prompts.length - 1) {
      setAnswers(nextAnswers);
      setIndex((value) => value + 1);
      return;
    }

    setAnswers(nextAnswers);
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
  }

  if (stage === "landing") {
    return (
      <section className="companion-onboarding companion-onboarding--landing">
        <div className="companion-onboarding__panel">
          <p className="section-label">初次相遇</p>
          <h1>她不会一开始就把自己交给你</h1>
          <p className="hero-copy">回答几个关于靠近感的问题，她会一点点变得清晰，直到真正出现在你面前。</p>
          <button type="button" className="primary-button" onClick={() => setStage("questions")}>
            开始遇见她
          </button>
        </div>
      </section>
    );
  }

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

  if (stage === "reveal" && result) {
    return (
      <section className="companion-onboarding companion-onboarding--reveal">
        <div className="companion-reveal card">
          <div className="companion-reveal__figure" aria-label={result.reveal.displayName}>
            <img src={result.reveal.portraitImageUrl ?? ""} alt={`${result.reveal.displayName}立绘`} className="companion-reveal__image" />
          </div>
          <div className="companion-reveal__content">
            <p className="section-label">她来到你这里</p>
            <h2>{result.reveal.displayName}</h2>
            <p className="companion-reveal__tagline">{result.reveal.tagline}</p>
            <p>{result.reveal.portraitDescription}</p>
            <p className="companion-reveal__match">{result.reveal.matchExplanation}</p>
            <button type="button" className="primary-button" onClick={() => onCompleted(result)}>
              和她开始今天的相处
            </button>
          </div>
        </div>
      </section>
    );
  }

  // questions stage (default when stage === "questions")
  return <OnboardingPrompt prompt={current.prompt} options={current.options} onSelect={handleSelect} />;
}
