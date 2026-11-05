export type OnboardingStage = "welcome" | "tour" | "auth";

type Listener = (completed: boolean) => void;
type StageListener = (stage: OnboardingStage) => void;

const listeners = new Set<Listener>();
const stageListeners = new Set<StageListener>();
let stage: OnboardingStage = "welcome";

function notify() {
  const completed = stage !== "tour";
  for (const listener of listeners) listener(completed);
  for (const listener of stageListeners) listener(stage);
}

export function getOnboardingStage(): OnboardingStage {
  return stage;
}

export function isOnboardingCompleted() {
  return stage !== "tour";
}

export function openOnboardingTour() {
  stage = "tour";
  notify();
}

export function completeOnboarding() {
  stage = "auth";
  notify();
}

export function returnToWelcome() {
  stage = "welcome";
  notify();
}

export function resetOnboarding() {
  stage = "tour";
  notify();
}

export function subscribeOnboardingState(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function subscribeOnboardingStage(listener: StageListener) {
  stageListeners.add(listener);
  return () => {
    stageListeners.delete(listener);
  };
}
