type Option = { label: string; value: string };

type OnboardingPromptProps = {
  prompt: string;
  options: Option[];
  onSelect: (value: string) => void;
};

export function OnboardingPrompt({ prompt, options, onSelect }: OnboardingPromptProps) {
  return (
    <section className="dream-prompt">
      <p className="dream-prompt__text">{prompt}</p>
      <div className="dream-prompt__options">
        {options.map((option) => (
          <button key={option.value} type="button" onClick={() => onSelect(option.value)}>
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}
