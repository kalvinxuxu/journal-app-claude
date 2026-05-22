type Props = {
  text: string;
};

export function CompanionHintLine({ text }: Props) {
  return <p className="companion-hint-line">{text}</p>;
}
