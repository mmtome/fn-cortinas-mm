// Cliente Supabase — só é criado se as variáveis de ambiente existirem.
// Sem elas, o app roda 100% local (modo atual). Com elas, liga o backend.
//
// Defina no .env / painel da Vercel:
//   VITE_SUPABASE_URL       = https://<projeto>.supabase.co
//   VITE_SUPABASE_ANON_KEY  = <anon public key>
// A anon key é pública por design — a segurança vem do RLS no Postgres.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** true quando há projeto Supabase configurado (backend ligado). */
export function isSupabaseConfigured(): boolean {
  return Boolean(URL && ANON);
}

let client: SupabaseClient | null = null;

/** Retorna o cliente Supabase (singleton) ou null se não configurado. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(URL!, ANON!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: "fn-cortinas:sb-auth",
      },
    });
  }
  return client;
}
