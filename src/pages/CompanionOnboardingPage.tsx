import { useState } from "react";
import { initializeCompanionOnboarding } from "../services/api/companionClient";
import type { InitialCompanionResult } from "../types/companion";
import { OnboardingPrompt } from "../components/companion/OnboardingPrompt";

const prompts = [
  {
    questionKey: "entry_mode",
    prompt: "如果我开始靠近你，你希望我更像真实的人，还是只会出现在你这里的梦？",
    options: [
      { label: "更真实一点", value: "real" },
      { label: "更像梦", value: "fantasy" },
    ],
  },
  {
    questionKey: "initiative_preference",
    prompt: "你更喜欢她主动靠近，还是把分寸留给你来决定？",
    options: [
      { label: "更克制一点", value: "low" },
      { label: "刚好就好", value: "balanced" },
      { label: "更主动一点", value: "high" },
    ],
  },
  {
    questionKey: "ideal_presence",
    prompt: "如果她第一次看向你，你更容易被怎样的感觉吸引？",
    options: [
      { label: "温柔成熟", value: "gentle_older" },
      { label: "安静柔和", value: "soft_stable" },
      { label: "有一点俏皮", value: "playful_warm" },
    ],
  },
];

type Props = {
  onCompleted: (result: InitialCompanionResult) => void;
};

export function CompanionOnboardingPage({ onCompleted }: Props) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<{ questionKey: string; answerValue: string }>>([]);

  const current = prompts[index];

  async function handleSelect(answerValue: string) {
    const nextAnswers = [...answers, { questionKey: current.questionKey, answerValue }];

    if (index === prompts.length - 1) {
      const result = await initializeCompanionOnboarding({
        userId: "local-user",
        answers: nextAnswers,
      });
      onCompleted(result);
      return;
    }

    setAnswers(nextAnswers);
    setIndex((value) => value + 1);
  }

  return <OnboardingPrompt prompt={current.prompt} options={current.options} onSelect={handleSelect} />;
}
