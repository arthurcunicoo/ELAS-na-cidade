import { useEffect, useMemo, useRef } from "react";
import { PanResponder } from "react-native";
import { createFrameScheduler } from "../frameScheduler";
export type DragOffset = { x: number; y: number };
type DragActions = {
  start: () => void;
  move: (offset: DragOffset) => void;
  end: (offset: DragOffset) => void;
};
export function useWebMapDrag(actions: DragActions) {
  const latest = useRef(actions);
  latest.current = actions;
  const offset = useRef<DragOffset>({ x: 0, y: 0 });
  const frames = useMemo(
    () =>
      createFrameScheduler<DragOffset>(
        (next) => latest.current.move(next),
        requestAnimationFrame,
        cancelAnimationFrame,
      ),
    [],
  );
  useEffect(() => () => frames.cancel(), [frames]);
  return useMemo(() => {
    const finish = () => {
      frames.cancel();
      latest.current.end(offset.current);
    };
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.hypot(gesture.dx, gesture.dy) > 6,
      onPanResponderGrant: () => {
        offset.current = { x: 0, y: 0 };
        latest.current.start();
      },
      onPanResponderMove: (_, gesture) => {
        offset.current = { x: gesture.dx, y: gesture.dy };
        frames.schedule(offset.current);
      },
      onPanResponderRelease: finish,
      onPanResponderTerminate: finish,
    });
  }, [frames]);
}
