import { useEffect, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    Platform.OS === "web"
      ? typeof window !== "undefined" &&
        !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      : true,
  );
  useEffect(() => {
    if (Platform.OS === "web") {
      if (typeof window === "undefined" || !window.matchMedia) return;
      const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
      const update = () => setReduced(preference.matches);
      update();
      preference.addEventListener("change", update);
      return () => preference.removeEventListener("change", update);
    }
    let active = true;
    let changed = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active && !changed) setReduced(value);
      })
      .catch(() => {
        if (active && !changed) setReduced(false);
      });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (value) => {
        changed = true;
        if (active) setReduced(value);
      },
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}
