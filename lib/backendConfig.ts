import { decode } from "base64-arraybuffer";
import { bundledBackend } from "../constants/backendPublic";

type ClientConfig = { url: string; key: string };
type Environment = {
  url?: string;
  publishableKey?: string;
  anonKey?: string;
  key?: string;
  appEnv?: string;
};
type LegacyKey = { role?: string; ref?: string; iss?: string };
export type BackendConfig = ClientConfig & {
  error: string;
  source: "bundled" | "environment" | "mixed";
};

function clean(value?: string): string {
  const text = (value ?? "").trim();
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) return text.slice(1, -1).trim();
  return text;
}
function hostedUrl(value: string): string {
  return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(value)
    ? value.replace(/\/$/, "").toLowerCase()
    : "";
}
function legacyKey(key: string): LegacyKey | null {
  if (key.length > 16384 || key.split(".").length !== 3) return null;
  try {
    const payload = key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const bytes = new Uint8Array(decode(padded));
    const value: unknown = JSON.parse(Array.from(bytes, b => String.fromCharCode(b)).join(""));
    return value && typeof value === "object" ? value as LegacyKey : null;
  } catch {
    return null;
  }
}

export function resolveBackendConfig(
  env: Environment,
  defaults?: ClientConfig,
): BackendConfig {
  // QA/staging and explicit production builds must supply their own environment.
  const mode = clean(env.appEnv).toLowerCase();
  const fallback = mode === "staging" || mode === "production" ? undefined : defaults;
  const suppliedUrl = clean(env.url);
  const suppliedKey = [env.publishableKey, env.anonKey, env.key].map(clean).find(Boolean) ?? "";
  const source = suppliedUrl || suppliedKey
    ? suppliedUrl && suppliedKey ? "environment" : "mixed"
    : "bundled";
  let url = suppliedUrl;
  let key = suppliedKey;
  if (!url && !key && fallback) {
    url = fallback.url;
    key = fallback.key;
  } else if (fallback) {
    // Never silently combine the packaged key with a different project.
    if (!key && hostedUrl(url) === hostedUrl(fallback.url)) key = fallback.key;
    const legacyRef = legacyKey(key)?.ref;
    if (!url && (key === fallback.key || (
      typeof legacyRef === "string" && hostedUrl(fallback.url) === `https://${legacyRef}.supabase.co`
    ))) url = fallback.url;
  }
  const fail = (error: string): BackendConfig => ({ url: "", key: "", error, source });
  if (!url)
    return fail("Falta a URL do projeto. Preencha EXPO_PUBLIC_SUPABASE_URL no .env da pasta do aplicativo e reinicie o Expo.");
  const normalizedUrl = hostedUrl(url);
  if (!normalizedUrl)
    return fail("A URL do Supabase está inválida. Use a URL HTTPS do projeto, no formato https://seu-projeto.supabase.co.");
  if (!key)
    return fail("Falta a chave pública do projeto. Preencha EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ou EXPO_PUBLIC_SUPABASE_ANON_KEY e reinicie o Expo.");
  const legacy = legacyKey(key);
  if (key.startsWith("sb_secret_") || legacy?.role === "service_role")
    return fail("Esta chave é administrativa e não pode ser usada no aplicativo. Use a chave publicável ou a chave pública anon do Supabase.");
  const publishable = key.startsWith("sb_publishable_") && key.length > "sb_publishable_".length && !/\s/.test(key);
  if (!publishable && !(legacy?.role === "anon" && legacy.iss === "supabase"))
    return fail("A chave informada não é uma chave pública do Supabase. Use a publicável (sb_publishable_) ou a chave anon, sem espaços no meio.");
  if (legacy?.ref && normalizedUrl !== `https://${legacy.ref}.supabase.co`)
    return fail("A URL e a chave anon pertencem a projetos diferentes. Copie as duas do mesmo projeto Supabase.");
  return { url: normalizedUrl, key, error: "", source };
}

// Expo replaces these explicit EXPO_PUBLIC_ references at build time.
export const backendConfig = resolveBackendConfig({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  publishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  key: process.env.EXPO_PUBLIC_SUPABASE_KEY,
  appEnv: process.env.EXPO_PUBLIC_APP_ENV,
}, bundledBackend);
