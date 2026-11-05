import { useCallback, useEffect, useState } from "react";
import { useSession } from "../auth/SessionProvider";
import { reviewExamplesEnabled } from "../../lib/appMode";
import { listPresentationReviews } from "../../services/presentationReviews";
import type { PresentationReview } from "./presentationReviews";

type State = { owner: string; placeId: string; rows: PresentationReview[]; loading: boolean; error: boolean };
export function usePresentationReviews(placeId?: string) {
  const owner = useSession().session?.user.id ?? "";
  const enabled = reviewExamplesEnabled && !!owner;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State | null>(null);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  useEffect(() => {
    if (!enabled || !placeId) return;
    const controller = new AbortController();
    setState({ owner, placeId, rows: [], loading: true, error: false });
    void listPresentationReviews(placeId, controller.signal).then((rows) => {
      if (!controller.signal.aborted) setState({ owner, placeId, rows, loading: false, error: false });
    }).catch(() => {
      if (!controller.signal.aborted) setState({ owner, placeId, rows: [], loading: false, error: true });
    });
    return () => controller.abort();
  }, [owner, placeId, enabled, attempt]);
  const current = enabled && state?.owner === owner && state.placeId === placeId ? state : null;
  return { enabled, rows: current?.rows ?? [], loading: enabled && !!placeId && (current?.loading ?? true), error: current?.error ?? false, retry };
}
