import { GreetingCard } from "../companion/GreetingCard";
import { GreetingRevealView } from "../companion/GreetingRevealView";
import type { GreetingCard as GreetingCardType } from "../../services/greetingStore";

export type GreetingWallItemProps = {
  greeting: GreetingCardType | null;
  pending: boolean;
  onRevealComplete: (id: string) => void;
};

export function GreetingWallItem({ greeting, pending, onRevealComplete }: GreetingWallItemProps) {
  if (pending && greeting) {
    return (
      <GreetingRevealView
        greeting={greeting}
        onComplete={() => onRevealComplete(greeting.id)}
      />
    );
  }
  return <GreetingCard onOpen={undefined} />;
}