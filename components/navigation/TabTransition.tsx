import { BlurTargetView, BlurView } from "expo-blur";
import { createContext, type ReactNode, useCallback, useContext, useLayoutEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View, type ViewInstance } from "react-native";
import Animated, { cancelAnimation, Easing, runOnJS, type SharedValue, useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { registerNavigationTransition } from "../../lib/navigation";

export const mainTabPaths = ["/mapa", "/eventos", "/alertas", "/perfil"] as const;
const authPaths = new Set(["/", "/login", "/cadastro", "/recuperar-senha"]);
const animatedRoute = (path: string) => !authPaths.has(path);
const EXIT_MS = 260, ENTER_MS = 340;
type Transition = {
  progress: SharedValue<number>;
  moving: boolean;
  navigate: (destination: string | null, dispatch: () => void) => void;
  openPanel: (open: () => void) => void;
  closePanel: (close: () => void) => void;
};
const Context = createContext<Transition | null>(null);
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

// A real blur radius/intensity grows before navigation, then decreases over
// the destination. The navigation bar is outside this viewport and stays sharp.
export function TabTransitionProvider({ path, reduced, children }: { path: string; reduced: boolean; children: ReactNode }) {
  const progress = useSharedValue(0);
  const [moving, setMoving] = useState(false);
  const route = useRef(path), previous = useRef(path), generation = useRef(0);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigationFrame = useRef<number | null>(null);
  const pending = useRef<{ destination: string | null; source: string; dispatch: () => void; dispatched: boolean } | null>(null);
  route.current = path;

  const stop = useCallback(() => {
    ++generation.current;
    cancelAnimation(progress);
    if (navigationFrame.current !== null) cancelAnimationFrame(navigationFrame.current);
    navigationFrame.current = null;
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = null;
  }, [progress]);
  const finishFocus = useCallback((ticket: number) => {
    if (ticket === generation.current) setMoving(false);
  }, []);
  const focus = useCallback(() => {
    stop();
    pending.current = null;
    const ticket = generation.current;
    // Keep the new screen defocused until its first frame has been painted.
    navigationFrame.current = requestAnimationFrame(() => {
      if (ticket !== generation.current) return;
      navigationFrame.current = requestAnimationFrame(() => {
        if (ticket !== generation.current) return;
        navigationFrame.current = null;
        progress.value = withTiming(0, { duration: ENTER_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
          if (finished) runOnJS(finishFocus)(ticket);
        });
      });
    });
  }, [finishFocus, progress, stop]);
  const commitNavigation = useCallback((ticket: number) => {
    if (ticket !== generation.current || !pending.current) return;
    // Let the outgoing blur reach the compositor before swapping screens.
    // Without a paint boundary, a busy web thread can skip that visible frame.
    navigationFrame.current = requestAnimationFrame(() => {
      if (ticket !== generation.current || !pending.current) return;
      navigationFrame.current = requestAnimationFrame(() => {
        if (ticket !== generation.current || !pending.current) return;
        navigationFrame.current = null;
        const request = pending.current;
        request.dispatched = true;
        timeout.current = setTimeout(focus, 1200);
        try {
          request.dispatch();
        } finally {
          if (request.destination === route.current) focus();
        }
      });
    });
  }, [focus]);
  const navigate = useCallback((destination: string | null, dispatch: () => void) => {
    if (destination && pending.current?.destination === destination) return;
    if (destination && !pending.current && route.current === destination) {
      dispatch(); // Same-screen search parameters still need to be applied.
      return;
    }
    stop();
    if (reduced || !animatedRoute(route.current) || (destination && !animatedRoute(destination))) {
      pending.current = null;
      progress.value = 0;
      setMoving(false);
      dispatch();
      return;
    }
    pending.current = { destination, source: route.current, dispatch, dispatched: false };
    const ticket = generation.current;
    setMoving(true);
    progress.value = withTiming(1, { duration: EXIT_MS, easing: Easing.inOut(Easing.quad) }, (finished) => {
      if (finished) runOnJS(commitNavigation)(ticket);
    });
  }, [commitNavigation, progress, reduced, stop]);
  const openPanel = useCallback((open: () => void) => {
    stop(); pending.current = null; open(); setMoving(!reduced);
    progress.value = reduced ? 0 : withTiming(1, { duration: EXIT_MS, easing: Easing.inOut(Easing.quad) });
  }, [progress, reduced, stop]);
  const closePanel = useCallback((close: () => void) => {
    close();
    if (reduced) { stop(); progress.value = 0; setMoving(false); }
    else focus();
  }, [focus, progress, reduced, stop]);

  useLayoutEffect(() => {
    const from = previous.current;
    previous.current = path;
    if (reduced || !animatedRoute(path)) {
      const request = pending.current;
      stop(); pending.current = null; progress.value = 0; setMoving(false);
      if (reduced && request && !request.dispatched) request.dispatch();
    } else if (pending.current?.dispatched && (pending.current.destination === path || (!pending.current.destination && pending.current.source !== path))) {
      focus();
    } else if (!pending.current && from !== path && animatedRoute(from)) {
      // Hardware Back and external navigation also arrive in focus.
      progress.value = 1; setMoving(true); focus();
    }
  }, [path, reduced, focus, progress, stop]);
  useLayoutEffect(() => registerNavigationTransition(navigate), [navigate]);
  useLayoutEffect(() => () => stop(), [stop]);

  return <Context.Provider value={{ progress, moving, navigate, openPanel, closePanel }}>{children}</Context.Provider>;
}
export function useTabTransition() {
  const transition = useContext(Context);
  if (!transition) throw new Error("TabTransitionProvider is required");
  return transition;
}
export function TabTransitionViewport({ children }: { children: ReactNode }) {
  const { progress, moving } = useTabTransition();
  const target = useRef<ViewInstance | null>(null), web = Platform.OS === "web";
  const androidFilter = Platform.OS === "android" && Number(Platform.Version) >= 31;
  const foreground = web || androidFilter;
  const sceneMotion = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + progress.value * 0.018 }],
    opacity: 1 - progress.value * 0.16,
    // Android 12+ blurs the rendered scene itself, including native screens.
    // This does not depend on a backdrop capturing the navigator correctly.
    ...(web ? { filter: `blur(${progress.value * 14}px)` }
      : androidFilter ? { filter: [{ blur: progress.value * 14 }] } : {}),
  }));
  const blurProps = useAnimatedProps(() => ({ intensity: progress.value * 85 }));
  const scene = (
    <Animated.View collapsable={false} testID="tab-transition-scene" pointerEvents={moving ? "none" : "auto"} style={[styles.scene, sceneMotion]}>
      {children}
    </Animated.View>
  );
  return (
    <View style={styles.viewport} testID="tab-transition-viewport" accessibilityState={{ busy: moving }} aria-busy={moving}>
      {foreground ? scene : <BlurTargetView ref={target} style={styles.scene}>{scene}</BlurTargetView>}
      {/* The unrestricted method also supports Android 7–11. The SDK31Plus
          variant silently disables blur on those phones. iOS uses UIBlur. */}
      {moving && !foreground && <AnimatedBlurView testID="tab-transition-blur" pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" blurTarget={target} blurMethod="dimezisBlurView" tint="default" animatedProps={blurProps} style={StyleSheet.absoluteFill} />}
    </View>
  );
}
const styles = StyleSheet.create({ viewport: { flex: 1, overflow: "hidden" }, scene: { flex: 1 } });
