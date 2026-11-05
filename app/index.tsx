import { router } from "expo-router";
import { useEffect, useState } from "react";
import { WelcomeOnboarding, WelcomeStartScreen } from "../components/OnboardingTour";
import {
  completeOnboarding,
  getOnboardingStage,
  openOnboardingTour,
  subscribeOnboardingStage,
} from "../features/map/onboardingEvent";

export default function Welcome() {
  const [stage, setStage] = useState(getOnboardingStage);
  useEffect(() => subscribeOnboardingStage(setStage), []);

  if (stage === "tour") {
    return (
      <WelcomeOnboarding
        onContinue={() => {
          completeOnboarding();
          router.push("/login");
        }}
        onRegister={() => {
          completeOnboarding();
          router.push("/cadastro");
        }}
      />
    );
  }

  return (
    <WelcomeStartScreen
      onHowItWorks={() => {
        openOnboardingTour();
      }}
      onStart={() => {
        completeOnboarding();
        router.push("/login");
      }}
      onRegister={() => {
        completeOnboarding();
        router.push("/cadastro");
      }}
    />
  );
}
