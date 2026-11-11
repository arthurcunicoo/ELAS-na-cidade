import { createClient } from "@supabase/supabase-js";
import { backendConfigured, backendFetch, requireBackend } from "./supabase";
import { Database } from "./database.types";
import { backendConfig } from "./backendConfig";

// Recovery sessions live only in this temporary client. They never authenticate
// the ordinary app session before the password is changed.
export function createRecoveryClient() {
  if (!backendConfigured) return null;
  requireBackend();
  return createClient<Database>(
    backendConfig.url,
    backendConfig.key,
    {
      global: { fetch: backendFetch },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: "elas-recovery-only",
      },
    },
  );
}
export function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
