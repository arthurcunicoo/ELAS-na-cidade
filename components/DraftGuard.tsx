import { useEffect, useRef, useState } from "react";
import { usePreventRemove } from "expo-router";
import { ProfileDialog, ProfileNotice } from "./ProfileDialog";
export function DraftGuard({
  enabled,
  saved = true,
  onSave,
}: {
  enabled: boolean;
  saved?: boolean;
  onSave?: () => Promise<unknown>;
}) {
  const [notice, setNotice] = useState<ProfileNotice | null>(null);
  const [leaving, setLeaving] = useState(false);
  const saving = useRef(false), active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => { if (!enabled) setLeaving(false); }, [enabled]);
  usePreventRemove(enabled && !leaving, ({ repeat }) =>
    setNotice({
      title: "Sair sem enviar?",
      message: saved
        ? "Seu rascunho ficará salvo neste aparelho por até 24 horas. Ele será apagado quando você sair da conta."
        : "Não foi possível salvar o rascunho neste aparelho. Sair agora pode perder os campos preenchidos.",
      confirmLabel: "Sair e guardar",
      confirm: () => {
        if (saving.current) return;
        saving.current = true;
        void Promise.resolve().then(() => onSave?.()).then(() => {
          if (active.current) { setLeaving(true); repeat(); }
        }).catch(() => {
          if (active.current) setNotice({ title: "Rascunho não salvo", message: "Não foi possível guardar os campos. Volte ao formulário para tentar novamente ou saia sem salvar.", confirmLabel: "Sair sem salvar", destructive: true, confirm: () => { if (active.current) { setLeaving(true); repeat(); } } });
        }).finally(() => { saving.current = false; });
      },
    }),
  );
  return <ProfileDialog notice={notice} onClose={() => setNotice(null)} />;
}
