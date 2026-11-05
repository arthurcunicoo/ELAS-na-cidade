import { reviewExamplesEnabled } from "../lib/appMode";
import { requireBackend } from "../lib/supabase";
import { parsePresentationReviews } from "../features/reviews/presentationReviews";

export async function listPresentationReviews(placeId: string, signal?: AbortSignal) {
  if (!reviewExamplesEnabled || !placeId) return [];
  let request = requireBackend().from("conteudos_demonstracao")
    .select("id,tipo,ficticio,ativo,lugar_id,nome_exibicao,descricao,sentimento,criado_em")
    .eq("tipo", "avaliacao").eq("ficticio", true).eq("ativo", true)
    .eq("lugar_id", placeId).like("id", "demo:apresentacao-avaliacao:%")
    .order("criado_em", { ascending: false }).order("id").limit(6);
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw error;
  return parsePresentationReviews(data, placeId);
}
