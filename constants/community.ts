import type { Place } from "./places";
import { statusText, ui } from "./theme";
export const communityMoods = ["Segura", "Moderada", "Cuidado"] as const;
export type CommunityMood = (typeof communityMoods)[number];
export type ReviewFactorMention = { label: string; count: number };
export type ReviewSummary = {
  classification: Place["status"];
  policyVersion: number;
  method: string;
  total: number;
  minimum: number;
  windowDays: number;
  distribution: Record<CommunityMood, number> | null;
  highlights?: { strengths: ReviewFactorMention[]; attention: ReviewFactorMention[] };
  lastContribution: string | null;
  ownReview?: { mood: CommunityMood; status: "pendente" | "aprovada" } | null;
};
export function communityStatus(
  summary?: ReviewSummary | null,
): Place["status"] {
  if (summary?.classification && summary.classification !== "unknown")
    return summary.classification;
  return summary?.ownReview?.mood === "Segura"
    ? "safe"
    : summary?.ownReview?.mood === "Moderada"
      ? "moderate"
      : summary?.ownReview?.mood === "Cuidado"
        ? "attention"
        : "unknown";
}
export function communityPresentation(place: Place) {
  if (place.demonstration)
    return {
      label:
        place.status === "safe"
          ? "Segura · demonstração"
          : "Cuidado · demonstração",
      color: place.status === "safe" ? statusText.safe : statusText.attention,
    };
  if (place.reviewsUnavailable)
    return { label: "Percepções indisponíveis agora", color: ui.muted };
  const personal =
    place.reviewSummary?.classification === "unknown" &&
    !!place.reviewSummary.ownReview;
  const suffix = personal ? " · sua avaliação" : "";
  return place.status === "safe"
    ? { label: `Seguro${suffix}`, color: statusText.safe }
    : place.status === "attention"
      ? { label: `Cuidado${suffix}`, color: statusText.danger }
      : place.status === "moderate"
        ? { label: `Moderado${suffix}`, color: statusText.moderate }
        : { label: "Sem avaliações suficientes", color: ui.muted };
}
export function equalReviewSummary(a?: ReviewSummary, b?: ReviewSummary) {
  return (
    a === b ||
    (!!a &&
      !!b &&
      a.classification === b.classification &&
      a.policyVersion === b.policyVersion &&
      a.method === b.method &&
      a.total === b.total &&
      a.minimum === b.minimum &&
      a.windowDays === b.windowDays &&
      a.lastContribution === b.lastContribution &&
      JSON.stringify(a.ownReview) === JSON.stringify(b.ownReview) &&
      JSON.stringify(a.highlights) === JSON.stringify(b.highlights) &&
      JSON.stringify(a.distribution) === JSON.stringify(b.distribution))
  );
}
