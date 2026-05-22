type Props = {
  text: string;
};

export function CompanionEchoCard({ text }: Props) {
  return (
    <section className="companion-echo-card card">
      <p className="section-label">她想起了你</p>
      <p>{text}</p>
    </section>
  );
}
