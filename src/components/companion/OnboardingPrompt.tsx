type Option = { label: string; value: string };

type OnboardingPromptProps = {
  prompt: string;
  options: Option[];
  onSelect: (value: string) => void;
};

export function OnboardingPrompt({ prompt, options, onSelect }: OnboardingPromptProps) {
  return (
    <section className="companion-onboarding companion-onboarding--question">
      <div className="companion-onboarding__panel companion-onboarding__panel--question">
        <p className="section-label">慢慢靠近</p>
        <h2 className="dream-prompt__text">{prompt}</h2>
      </div>
      <div className="dream-prompt__options">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="onboarding-option"
            onClick={() => onSelect(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}
