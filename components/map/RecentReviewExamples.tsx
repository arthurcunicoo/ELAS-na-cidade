import { StyleSheet, Text, View } from "react-native";
import { TouchFeedback } from "../TouchFeedback";
import { LoadingIndicator } from "../loading/LoadingIndicator";
import { colors, glass, radius, statusText, typography, ui } from "../../constants/theme";
import type { PresentationReview } from "../../features/reviews/presentationReviews";

const labels = { Segura: "Seguro", Moderada: "Moderado", Cuidado: "Cuidado" };
const moodColors = { Segura: statusText.safe, Moderada: statusText.moderate, Cuidado: statusText.danger };
type Props = { reviews: PresentationReview[]; loading: boolean; error: boolean; expanded: boolean; onExpand: () => void; onRetry: () => void };
export function RecentReviewExamples({ reviews, loading, error, expanded, onExpand, onRetry }: Props) {
  if (!loading && !error && !reviews.length) return null;
  if (!expanded) return (
    <TouchFeedback label="Ver avaliações de apresentação" onPress={onExpand} style={styles.preview}>
      <Text style={styles.action}>{loading ? "Carregando exemplos…" : error ? "Avaliações de apresentação indisponíveis" : `${reviews.length} avaliações de apresentação`}</Text>
      <Text style={styles.hint}>Ver tudo ›</Text>
    </TouchFeedback>
  );
  return (
    <View style={styles.section} testID="recent-review-examples">
      <Text accessibilityRole="header" style={styles.title}>Avaliações recentes</Text>
      <Text style={styles.notice}>Apresentação · nomes e comentários fictícios</Text>
      {loading ? <LoadingIndicator showLabel label="Carregando avaliações de apresentação" /> : error ? (
        <>
          <Text accessibilityRole="alert" style={styles.note}>Não foi possível carregar os exemplos. As avaliações reais continuam separadas.</Text>
          <TouchFeedback label="Tentar carregar avaliações de apresentação novamente" onPress={onRetry}><Text style={styles.action}>Tentar novamente</Text></TouchFeedback>
        </>
      ) : reviews.map((review) => (
        <View key={review.id} style={styles.review}>
          <View style={styles.row}>
            <View accessible={false} style={styles.avatar}><Text style={styles.initial}>{review.author.slice(0, 1)}</Text></View>
            <View style={styles.identity}>
              <Text style={styles.author}>{review.author}</Text>
              <Text style={styles.date}>{new Date(review.createdAt).toLocaleDateString("pt-BR")} · exemplo</Text>
            </View>
            <Text style={[styles.mood, { color: moodColors[review.mood] }]}>{labels[review.mood]}</Text>
          </View>
          <Text style={styles.comment}>{review.comment}</Text>
        </View>
      ))}
      <Text style={styles.note}>Cenários ilustrativos: não descrevem a segurança real deste lugar.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  section: { marginVertical: 14, gap: 12 },
  title: { fontSize: typography.input, fontWeight: "700", color: ui.text },
  notice: { fontSize: typography.caption, lineHeight: 18, fontWeight: "600", color: colors.wine },
  note: { fontSize: typography.secondary, lineHeight: 21, color: ui.muted },
  preview: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, paddingHorizontal: 13, paddingVertical: 10, borderRadius: radius.medium, backgroundColor: glass.surfaceSoft, borderWidth: 1, borderColor: glass.tintedBorder },
  action: { flex: 1, color: colors.pink, fontSize: typography.secondary, lineHeight: 20, fontWeight: "700" },
  hint: { color: colors.wine, fontSize: typography.caption, fontWeight: "600" },
  review: { padding: 12, gap: 10, borderRadius: radius.medium, backgroundColor: glass.surfaceSoft, borderWidth: 1, borderColor: glass.tintedBorder },
  row: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  avatar: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: glass.surfaceSoft, alignItems: "center", justifyContent: "center" },
  initial: { fontSize: typography.body, color: colors.wine, fontWeight: "700" },
  identity: { flex: 1, minWidth: 90 },
  author: { fontSize: typography.body, color: ui.text, fontWeight: "700" },
  date: { fontSize: typography.caption, lineHeight: 18, color: ui.muted },
  mood: { flexShrink: 1, fontSize: typography.secondary, fontWeight: "700" },
  comment: { fontSize: typography.body, lineHeight: 21, color: ui.text },
});
