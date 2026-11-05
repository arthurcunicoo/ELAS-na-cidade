import { communityMoods, type CommunityMood } from "../../constants/community";

export type PresentationReview = {
  id: string;
  placeId: string;
  author: string;
  comment: string;
  mood: CommunityMood;
  createdAt: string;
};
export function parsePresentationReviews(data: unknown, placeId: string): PresentationReview[] {
  if (!Array.isArray(data) || data.length > 6) throw new Error("Exemplos de avaliações inválidos.");
  const ids = new Set<string>();
  return data.map((row) => {
    if (!row || typeof row !== "object" || typeof row.id !== "string" ||
      !row.id.startsWith("demo:apresentacao-avaliacao:") || ids.has(row.id) ||
      row.tipo !== "avaliacao" || row.ficticio !== true || row.ativo !== true ||
      row.lugar_id !== placeId || !communityMoods.includes(row.sentimento) ||
      typeof row.nome_exibicao !== "string" || !row.nome_exibicao.trim() || row.nome_exibicao.length > 80 ||
      typeof row.descricao !== "string" || !row.descricao.trim() || row.descricao.length > 1000 ||
      typeof row.criado_em !== "string" || !Number.isFinite(Date.parse(row.criado_em))) {
      throw new Error("Exemplos de avaliações inválidos.");
    }
    ids.add(row.id);
    return { id: row.id, placeId, author: row.nome_exibicao, comment: row.descricao, mood: row.sentimento, createdAt: row.criado_em };
  });
}
export function presentationClassification(reviews: PresentationReview[]) {
  const count = (mood: CommunityMood) => reviews.filter((review) => review.mood === mood).length;
  const safe = count("Segura"), moderate = count("Moderada"), care = count("Cuidado");
  if (safe > moderate && safe > care) return "safe" as const;
  if (care > safe && care > moderate) return "attention" as const;
  return "moderate" as const;
}
