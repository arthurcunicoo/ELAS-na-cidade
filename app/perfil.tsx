import { signOut } from "../services/account";
import { cardShadow, colors, fonts, glass, radius, typography, pageContent } from "../constants/theme";
import { unreadCount } from "../features/community/notifications";
import { clearAccountDrafts } from "../features/reports/drafts";
import { useSession } from "../features/auth/SessionProvider";
import { useProfile } from "../features/profile/ProfileProvider";
import { isAdministrator } from "../features/auth/authorization";
import { useParticipation } from "../features/community/useParticipation";
import { originalAchievementProgress } from "../features/community/progress";
import { backendConfigured, friendlyError } from "../lib/supabase";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { router } from "../lib/navigation";
import { StatusBar } from "expo-status-bar";
import { ProfileHeader } from "../components/ProfileHeader";
import { AchievementCard } from "../components/AchievementCard";
import { ProfileMenuItem } from "../components/ProfileMenuItem";
import { ProfileDialog, ProfileNotice } from "../components/ProfileDialog";
import { MotionReveal } from "../components/MotionReveal";
import { returnToWelcome } from "../features/map/onboardingEvent";

export default function Profile() {
  const { session } = useSession();
  const { profile, role, error: profileError, refresh } = useProfile();
  const progress = useParticipation();
  const count = progress.data?.avaliacoes ?? null;
  const dataError = profileError || progress.error;
  const [unread, setUnread] = useState<number | null>(null);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (backendConfigured)
        void unreadCount()
          .then((n) => {
            if (active) setUnread(n);
          })
          .catch(() => {
            if (active) setUnread(null);
          });
      return () => {
        active = false;
      };
    }, []),
  );
  const [signingOut, setSigningOut] = useState(false);
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  const [notice, setNotice] = useState<ProfileNotice | null>(null);
  function openAchievements() {
    router.push("/conquistas");
  }
  function handleLogout() {
    setNotice({
      title: "Sair do perfil?",
      confirmLabel: "Sair",
      message: "Você voltará para a tela de login.",
      confirm: () => {
        void logout();
      },
    });
  }
  async function logout() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      if (backendConfigured) {
        await signOut();
        if (session) await clearAccountDrafts(session.user.id);
      }
      returnToWelcome();
      router.replace("/");
    } catch (e) {
      setNotice({ title: "Não foi possível sair", message: friendlyError(e) });
    } finally {
      setSigningOut(false);
    }
  }
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <ProfileHeader
            name={backendConfigured ? profile?.nome || "Meu perfil" : undefined}
            email={backendConfigured ? session?.user.email || "" : undefined}
            avatar={
              profile?.avatar_url ? { uri: profile.avatar_url } : undefined
            }
            onEdit={() => router.push("/foto-perfil")}
          />
        </View>
        <View style={styles.body}>
          <MotionReveal
            duration={360}
            delay={80}
            distance={20}
            style={styles.overlap}
          >
            <View>
              <AchievementCard
                count={backendConfigured ? count : undefined}
                items={
                  backendConfigured
                    ? progress.data
                      ? originalAchievementProgress(progress.data)
                      : []
                    : undefined
                }
                onMore={openAchievements}
              />
            </View>
          </MotionReveal>
          <View style={styles.menu}>
            {!!dataError && (
              <Text accessibilityRole="alert" style={{ color: colors.wine }}>
                {dataError}
              </Text>
            )}
            <Text accessibilityRole="header" style={styles.section}>
              Minha participação
            </Text>
            <View style={styles.group}>
              {backendConfigured && (
                <ProfileMenuItem
                  title="Minhas avaliações"
                  icon="list"
                  onPress={() => router.push("/minhas-avaliacoes")}
                />
              )}
              {backendConfigured && (
                <>
                  <ProfileMenuItem
                    title="Meus favoritos"
                    icon="heart-outline"
                    onPress={() => router.push("/favoritos")}
                  />
                  <ProfileMenuItem
                    title="Meus relatos"
                    icon="megaphone-outline"
                    onPress={() => router.push("/meus-relatos")}
                  />
                  <ProfileMenuItem
                    title="Minhas solicitações"
                    icon="construct-outline"
                    onPress={() => router.push("/minhas-solicitacoes")}
                  />
                  <ProfileMenuItem
                    title="Notificações"
                    badge={unread}
                    last
                    icon="notifications-outline"
                    onPress={() => router.push("/notificacoes")}
                  />
                </>
              )}
              {!backendConfigured && (
                <ProfileMenuItem
                  title="Conquistas"
                  icon="ribbon-outline"
                  onPress={openAchievements}
                  last
                />
              )}
            </View>
            {backendConfigured && !!session && isAdministrator(role) && (
              <>
                <Text accessibilityRole="header" style={styles.section}>
                  Equipe
                </Text>
                <View style={styles.group}>
                  <ProfileMenuItem
                    title="Administração"
                    icon="shield-checkmark-outline"
                    onPress={() => router.push("/admin")}
                    last
                  />
                </View>
              </>
            )}
            <Text accessibilityRole="header" style={styles.section}>
              Minha conta
            </Text>
            <View style={styles.group}>
              <MotionReveal duration={320} delay={140} distance={12}>
                <ProfileMenuItem
                  title="Informações pessoais"
                  icon="pencil"
                  onPress={() => router.push("/informacoes-pessoais")}
                />
              </MotionReveal>
              <MotionReveal duration={320} delay={190} distance={12}>
                <ProfileMenuItem
                  title="Configurações"
                  icon="settings"
                  onPress={() => router.push("/configuracoes")}
                  last
                />
              </MotionReveal>
            </View>
            <MotionReveal duration={320} delay={240} distance={12}>
              <View style={styles.group}>
                <ProfileMenuItem
                  title={signingOut ? "Saindo..." : "Sair"}
                  icon="log-out"
                  onPress={handleLogout}
                  last
                />
              </View>
            </MotionReveal>
          </View>
        </View>
      </ScrollView>
      <ProfileDialog notice={notice} onClose={() => setNotice(null)} />
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { flexGrow: 1, paddingBottom: 40 },
  body: { ...pageContent },
  overlap: { marginTop: -22 },
  menu: { marginTop: 10, gap: 12 },
  section: {
    color: colors.wine,
    fontFamily: fonts.display,
    fontSize: typography.secondary,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginTop: 10,
    paddingHorizontal: 6,
  },
  group: {
    backgroundColor: glass.surfaceStrong,
    borderRadius: radius.large,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: glass.border,
    ...cardShadow,
  },
});
