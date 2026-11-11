import { LoadingState } from "../components/loading/LoadingState";
import { useCallback, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { router } from "../lib/navigation";
import { FeaturePage, Action, Message, shared } from "../components/shared/FeaturePage";
import { recordDetail, updateRecord, RecordDetail, statusLabels } from "../features/reports/records";
import { HistoryList } from "../features/reports/HistoryList";
import { friendlyError } from "../lib/supabase";
export default function RecordScreen() {
  const { kind, id } = useLocalSearchParams<{ kind: string; id: string }>();
  const valid =
    kind === "relato" || kind === "melhoria" || kind === "avaliacao";
  const [row, setRow] = useState<RecordDetail | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [version, setVersion] = useState(0);
  const lock = useRef(false);
  useFocusEffect(
    useCallback(() => {
      void version;
      let active = true;
      setLoading(true);
      setError("");
      setRow(null);
      if (!valid || !id) {
        setLoading(false);
        setError("Registro inválido.");
        return;
      }
      void recordDetail(kind, id)
        .then((value) => {
          if (active) {
            setRow(value);
          }
        })
        .catch((e) => {
          if (active) setError(friendlyError(e));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [kind, id, valid, version]),
  );
  async function withdraw() {
    if (!row || lock.current || (kind !== "relato" && kind !== "melhoria"))
      return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await updateRecord(
        kind,
        row,
        { descricao: row.descricao, titulo: row.titulo },
        true,
      );
      setConfirm(false);
      setVersion((v) => v + 1);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const pending =
    row?.proprio && (row.status === "pendente" || row.status === "solicitada");
  const canWithdraw = pending && (kind === "relato" || kind === "melhoria");
  return (
    <FeaturePage
      title={
        kind === "relato"
          ? "Detalhes do relato"
          : kind === "melhoria"
            ? "Detalhes da solicitação"
            : "Detalhes da avaliação"
      }
    >
      <Message text={error} error />
      {loading ? (
        <LoadingState
          title="Cada história conta"
          message="Buscando os detalhes deste registro."
        />
      ) : !row ? (
        <View style={shared.card}>
          <Text style={shared.title}>Registro indisponível</Text>
          <Text style={shared.note}>
            Ele pode ter sido excluído ou não estar acessível para esta conta.
          </Text>
          <Action
            secondary
            title="Tentar novamente"
            onPress={() => setVersion((v) => v + 1)}
          />
        </View>
      ) : (
        <View style={shared.card}>
          <Text style={shared.title}>
            {row.titulo ?? row.local_texto ?? row.categoria}
          </Text>
          <Text style={shared.label}>
            {row.sentimento ?? row.categoria} ·{" "}
            {statusLabels[row.status] ?? row.status}
          </Text>
          {pending && (
            <Text style={shared.note}>
              {kind === "relato"
                ? "Seu relato · aguardando verificação"
                : kind === "melhoria"
                  ? "Sua solicitação · aguardando análise"
                  : "Sua avaliação · aguardando análise"}
              . Visível apenas para você e para a equipe, ainda não publicado
              para a cidade.
            </Text>
          )}
          <Text style={shared.note}>{row.descricao || "Sem comentário."}</Text>
          <Text style={shared.note}>
            Atualizado em {new Date(row.atualizado_em).toLocaleString("pt-BR")}
          </Text>
          {(row.lugar_id || row.latitude != null) && (
            <Action
              secondary
              title={
                row.lugar_id
                  ? "Ver lugar no mapa"
                  : "Ver localização aproximada"
              }
              onPress={() =>
                router.navigate({
                  pathname: "/mapa",
                  params: row.lugar_id
                    ? { placeId: row.lugar_id, reportId: "" }
                    : { reportId: row.id, placeId: "" },
                })
              }
            />
          )}
          {canWithdraw && (
            <Action
              secondary
              title="Retirar meu registro"
              busy={busy}
              onPress={() => setConfirm(true)}
            />
          )}
          {canWithdraw && confirm && (
            <>
              <Text style={shared.note}>
                Retirar este registro? O histórico será preservado e ele sairá
                da fila de análise.
              </Text>
              <Action
                title="Confirmar retirada"
                busy={busy}
                onPress={() => void withdraw()}
              />
              <Action
                secondary
                title="Manter registro"
                busy={busy}
                onPress={() => setConfirm(false)}
              />
            </>
          )}
          {row.proprio && valid && (
            <HistoryList key={version} kind={kind} id={row.id} />
          )}
        </View>
      )}
    </FeaturePage>
  );
}
