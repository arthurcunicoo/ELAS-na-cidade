import { router as expoRouter } from "expo-router";

type Transition = (destination: string | null, dispatch: () => void) => void;
let transition: Transition | null = null;
// Registered only by the mounted app root; cleanup cannot remove a newer root.
export function registerNavigationTransition(next: Transition) {
  transition = next;
  return () => { if (transition === next) transition = null; };
}
function pathname(href: Parameters<typeof expoRouter.push>[0]): string | null {
  const value = typeof href === "string" ? href : href.pathname;
  return value.startsWith("/") ? value.split(/[?#]/, 1)[0] : null;
}
function navigate(destination: string | null, dispatch: () => void) {
  if (transition) transition(destination, dispatch);
  else dispatch();
}
const transitioned: Pick<typeof expoRouter, "push" | "navigate" | "replace" | "back"> = {
  push: (...args) => navigate(pathname(args[0]), () => expoRouter.push(...args)),
  navigate: (...args) => navigate(pathname(args[0]), () => expoRouter.navigate(...args)),
  replace: (...args) => navigate(pathname(args[0]), () => expoRouter.replace(...args)),
  back: (...args) => navigate(null, () => expoRouter.back(...args)),
};
// SDK 58 binds the imperative router after the first render. Reading methods
// lazily avoids keeping its pre-mount stubs (for example canGoBack/setParams).
export const router: typeof expoRouter = new Proxy(expoRouter, {
  get(target, property, receiver) {
    return Object.prototype.hasOwnProperty.call(transitioned, property)
      ? Reflect.get(transitioned, property)
      : Reflect.get(target, property, receiver);
  },
});
