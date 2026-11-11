import { demoMode } from "./appMode";
import "react-native-url-polyfill/auto";
import { protectedStorage } from "./storage/protectedStorage";
import { createClient, processLock } from "@supabase/supabase-js";
import { monitoredFetch } from "./monitoring";
import { deadlineFetch } from "./request";
import { Database } from "./database.types";
import { backendConfig } from "./backendConfig";
const { url, key } = backendConfig;
export const configError = demoMode ? "" : backendConfig.error;
export const backendConfigured =
  !demoMode && Boolean(url && key && !configError);
export const backendFetch = deadlineFetch(monitoredFetch(fetch), 20000);
export const supabase = backendConfigured
  ? createClient<Database>(url!, key!, {
      global: {
        fetch: backendFetch,
      },
      auth: {
        storage: protectedStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock,
      },
    })
  : null;
export function requireBackend() {
  if (!supabase)
    throw new Error(configError || "O modo offline não usa uma conexão com o Supabase.");
  return supabase;
}
export { friendlyError } from "./errors";
