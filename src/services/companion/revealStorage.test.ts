import { describe, expect, it, beforeEach } from "vitest";
import { loadCompanionReveal, saveCompanionReveal, clearCompanionReveal } from "./revealStorage";

const sampleReveal = {
  displayName: "岚夕",
  tagline: "她像夜色里慢慢靠近的人，安静，却不会让你觉得遥远。",
  appearancePrompt: "full body portrait, japanese semi-realistic style",
  portraitDescription: "她站着的时候很稳。",
  matchExplanation: "她会先给你安全感。",
};

describe("revealStorage", () => {
  beforeEach(() => clearCompanionReveal());

  it("round-trips the reveal summary through localStorage", () => {
    saveCompanionReveal(sampleReveal);
    expect(loadCompanionReveal()).toEqual(sampleReveal);
  });
});