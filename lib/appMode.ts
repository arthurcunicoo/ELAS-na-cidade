// Core features use the real backend. Optional review examples stay separate.
export const demoMode = process.env.EXPO_PUBLIC_DEMO === "1";
export const showcaseEnabled: boolean = false;
// Review samples are opt-in presentation content, never public perceptions.
export const reviewExamplesEnabled =
  process.env.EXPO_PUBLIC_APP_ENV === "presentation" &&
  process.env.EXPO_PUBLIC_REVIEW_EXAMPLES === "1";
