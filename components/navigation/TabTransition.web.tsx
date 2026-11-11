import { createContext, type ReactNode, useCallback, useContext, useLayoutEffect, useRef, useState } from "react";
import { StyleSheet, View, type ViewInstance } from "react-native";
import { registerNavigationTransition } from "../../lib/navigation";

export const mainTabPaths = ["/mapa", "/eventos", "/alertas", "/perfil"] as const;
const authPaths = new Set(["/", "/login", "/cadastro", "/recuperar-senha"]);
const animatedRoute = (path: string) => !authPaths.has(path);
const EXIT_MS = 150, ENTER_MS = 220;
const focused = { filter: "none", transform: "none", opacity: "1" };
const defocused = { filter: "blur(6px)", transform: "scale(1.008)", opacity: "0.92" };
type Frame = typeof focused;
type Pending = {
  destination: string | null;
  source: string;
  dispatch: () => void;
  dispatched: boolean;
};
type Transition = {
  moving: boolean;
  attachScene: (view: ViewInstance | null) => void;
  navigate: (destination: string | null, dispatch: () => void) => void;
  openPanel: (open: () => void) => void;
  closePanel: (close: () => void) => void;
};
const Context = createContext<Transition | null>(null);

export function TabTransitionProvider({ path, reduced, children }: { path: string; reduced: boolean; children: ReactNode }) {
  const [moving, setMoving] = useState(false);
  const scene = useRef<HTMLElement | null>(null);
  const route = useRef(path), previous = useRef(path), generation = useRef(0);
  const pending = useRef<Pending | null>(null);
  const visual = useRef<Frame>(focused);
  const animation = useRef<Animation | null>(null);
  const frame = useRef<number | null>(null);
  const timers = useRef<{
    finish?: ReturnType<typeof setTimeout>;
    paint?: ReturnType<typeof setTimeout>;
    route?: ReturnType<typeof setTimeout>;
  }>({});
  route.current = path;

  const attachScene = useCallback((view: ViewInstance | null) => {
    // A React Native Web View ref is the underlying DOM element.
    scene.current = view as unknown as HTMLElement | null;
  }, []);
  const apply = useCallback((next: Frame, settled = true) => {
    visual.current = next;
    const node = scene.current;
    if (!node) return;
    if (next === focused && settled) {
      node.style.removeProperty("filter");
      node.style.removeProperty("transform");
      node.style.removeProperty("opacity");
      node.removeAttribute("data-elas-motion");
    } else {
      node.style.filter = next.filter;
      node.style.transform = next.transform;
      node.style.opacity = next.opacity;
      node.setAttribute("data-elas-motion", "active");
    }
  }, []);
  const stop = useCallback((preserve = true) => {
    ++generation.current;
    if (preserve && animation.current && scene.current) {
      // Only interrupted transitions need a computed-style read.
      const style = getComputedStyle(scene.current);
      apply({ filter: style.filter, transform: style.transform, opacity: style.opacity });
    }
    animation.current?.cancel();
    animation.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    for (const timer of Object.values(timers.current)) clearTimeout(timer);
    timers.current = {};
  }, [apply]);
  const afterPaint = useCallback((next: () => void) => {
    const ticket = generation.current;
    let done = false;
    const finish = () => {
      if (ticket !== generation.current || done) return;
      done = true;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      clearTimeout(timers.current.paint);
      delete timers.current.paint;
      next();
    };
    frame.current = requestAnimationFrame(() => {
      if (ticket !== generation.current) return;
      frame.current = requestAnimationFrame(finish);
    });
    // Navigation must not stay locked if the browser postpones painting.
    timers.current.paint = setTimeout(finish, 180);
  }, []);
  const play = useCallback((to: Frame, duration: number, next: () => void) => {
    const node = scene.current, from = visual.current;
    const ticket = generation.current;
    let done = false;
    const finish = () => {
      if (ticket !== generation.current || done) return;
      done = true;
      clearTimeout(timers.current.finish);
      delete timers.current.finish;
      animation.current?.cancel();
      animation.current = null;
      apply(to);
      next();
    };
    apply(to, false);
    if (!node || typeof node.animate !== "function") {
      finish();
      return;
    }
    // The browser owns interpolation. No JavaScript style write on every frame.
    try {
      const effect = node.animate([from, to], {
        duration,
        easing: to === focused ? "cubic-bezier(.18,.72,.28,1)" : "ease-in-out",
      });
      animation.current = effect;
      void effect.finished.then(finish, () => {});
      timers.current.finish = setTimeout(finish, duration + 120);
    } catch {
      finish();
    }
  }, [apply]);
  const focus = useCallback(() => {
    stop();
    pending.current = null;
    afterPaint(() => play(focused, ENTER_MS, () => setMoving(false)));
  }, [afterPaint, play, stop]);
  const navigate = useCallback((destination: string | null, dispatch: () => void) => {
    if (destination && pending.current?.destination === destination) return;
    if (destination && !pending.current && route.current === destination) {
      dispatch();
      return;
    }
    stop();
    if (reduced || !animatedRoute(route.current) || (destination && !animatedRoute(destination))) {
      pending.current = null;
      apply(focused);
      setMoving(false);
      dispatch();
      return;
    }
    pending.current = { destination, source: route.current, dispatch, dispatched: false };
    setMoving(true);
    play(defocused, EXIT_MS, () => afterPaint(() => {
      const request = pending.current;
      if (!request) return;
      request.dispatched = true;
      timers.current.route = setTimeout(focus, 1200);
      try {
        request.dispatch();
      } finally {
        if (request.destination === route.current) focus();
      }
    }));
  }, [afterPaint, apply, focus, play, reduced, stop]);
  const openPanel = useCallback((open: () => void) => {
    stop();
    pending.current = null;
    open();
    setMoving(!reduced);
    if (reduced) apply(focused);
    else play(defocused, EXIT_MS, () => {});
  }, [apply, play, reduced, stop]);
  const closePanel = useCallback((close: () => void) => {
    close();
    if (reduced) {
      stop(false);
      apply(focused);
      setMoving(false);
    } else focus();
  }, [apply, focus, reduced, stop]);

  useLayoutEffect(() => {
    const from = previous.current;
    previous.current = path;
    const request = pending.current;
    if (reduced || !animatedRoute(path)) {
      stop(false);
      pending.current = null;
      apply(focused);
      setMoving(false);
      if (reduced && request && !request.dispatched) request.dispatch();
    } else if (request?.dispatched && (
      request.destination === path || (!request.destination && request.source !== path)
    )) {
      focus();
    } else if (!request && from !== path && animatedRoute(from)) {
      // Browser Back and route changes outside the navigation helper still animate.
      stop(false);
      apply(defocused);
      setMoving(true);
      focus();
    }
  }, [path, reduced, apply, focus, stop]);
  useLayoutEffect(() => registerNavigationTransition(navigate), [navigate]);
  useLayoutEffect(() => () => stop(false), [stop]);

  return <Context.Provider value={{ moving, attachScene, navigate, openPanel, closePanel }}>{children}</Context.Provider>;
}

export function useTabTransition() {
  const transition = useContext(Context);
  if (!transition) throw new Error("TabTransitionProvider is required");
  return transition;
}
export function TabTransitionViewport({ children }: { children: ReactNode }) {
  const { moving, attachScene } = useTabTransition();
  return (
    <View style={styles.viewport} testID="tab-transition-viewport" accessibilityState={{ busy: moving }} aria-busy={moving}>
      <View ref={attachScene} collapsable={false} testID="tab-transition-scene" pointerEvents={moving ? "none" : "auto"} style={styles.scene}>
        {children}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({ viewport: { flex: 1, overflow: "hidden" }, scene: { flex: 1 } });
