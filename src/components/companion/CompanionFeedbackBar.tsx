type Props = {
  onSelect: (value: "tone_like" | "less_initiative" | "more_recall") => void;
};

export function CompanionFeedbackBar({ onSelect }: Props) {
  return (
    <div className="companion-feedback-bar" aria-label="陪伴反馈">
      <button type="button" onClick={() => onSelect("tone_like")}>
        更喜欢她这样说
      </button>
      <button type="button" onClick={() => onSelect("less_initiative")}>
        希望她别这么主动
      </button>
      <button type="button" onClick={() => onSelect("more_recall")}>
        多记住这种事
      </button>
    </div>
  );
}
