/**
 * Companion service layer.
 * Re-exports onboarding questions for use across the app.
 */
export { COMPANION_INTAKE_CONFIG, ABOUT_YOU_QUESTIONS, ABOUT_HER_QUESTIONS } from "./onboardingQuestions";
export { generateRevealPortrait } from "./portraitGeneration";
export { loadCompanionReveal, saveCompanionReveal, clearCompanionReveal } from "./revealStorage";