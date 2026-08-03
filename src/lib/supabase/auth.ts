// Autenticação real via Supabase Auth (e-mail + senha), ativa apenas quando
// o backend está configurado. Mantém a "loja atual" (tenant) e o papel do
// usuário, usados pelo RLS e pela sincronização.

import { useSyncExternalStore } from "react";
import { getSupabase, isSupabaseConfigured } from "./client";

export interface SupabaseUser {
  nome: string;
  email: string;
  nivel: "Admin" | "Operador";
}

interface SBState {
  ready: boolean;            // já sabemos se há sessão ou não
  user: SupabaseUser | null;
  tenantId: string | null;
  userId: string | null;
}

let state: SBState = { ready: !isSupabaseConfigured(), user: null, tenantId: null, userId: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
function set(p: Partial<SBState>) { state = { ...state, ...p }; emit(); }

/** Loja (tenant) atual — usado pelo adaptador de sync. */
export function getCurrentTenantId(): string | null {
  return state.tenantId;
}

// Carrega o vínculo (tenant + papel) do usuário logado.
async function loadMembership(userId: string, email: string, nome: string) {
  const sb = getSupabase();
  if (!sb) return;
  const { data, error } = await sb
    .from("memberships")
    .select("tenant_id, role")
    .limit(1)
    .maybeSingle();
  if (error || !data) {
    // Autenticou mas ainda não está vinculado a nenhuma loja.
    set({ ready: true, userId, user: { nome, email, nivel: "Operador" }, tenantId: null });
    return;
  }
  set({
    ready: true,
    userId,
    tenantId: data.tenant_id as string,
    user: { nome, email, nivel: (data.role as "Admin" | "Operador") ?? "Operador" },
  });
}

function nomeDe(email: string, meta: Record<string, unknown> | undefined): string {
  const n = meta?.nome ?? meta?.name ?? meta?.full_name;
  return typeof n === "string" && n.trim() ? n : email.split("@")[0];
}

let started = false;
/** Liga o acompanhamento de sessão (client only). No-op sem backend. */
export function initSupabaseAuth() {
  if (started || typeof window === "undefined") return;
  const sb = getSupabase();
  if (!sb) return; // sem backend: nada a fazer
  started = true;

  sb.auth.getSession().then(({ data }) => {
    const s = data.session;
    if (s?.user) void loadMembership(s.user.id, s.user.email ?? "", nomeDe(s.user.email ?? "", s.user.user_metadata));
    else set({ ready: true, user: null, tenantId: null, userId: null });
  });

  sb.auth.onAuthStateChange((_evt, session) => {
    if (session?.user) {
      void loadMembership(session.user.id, session.user.email ?? "", nomeDe(session.user.email ?? "", session.user.user_metadata));
    } else {
      set({ ready: true, user: null, tenantId: null, userId: null });
    }
  });
}

export const supabaseAuth = {
  async signIn(email: string, senha: string): Promise<{ ok: boolean; erro?: string }> {
    const sb = getSupabase();
    if (!sb) return { ok: false, erro: "Backend não configurado" };
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error) return { ok: false, erro: error.message };
    return { ok: true };
  },
  async signOut() {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
  },
};

export function useSupabaseAuth() {
  const s = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => state,
    () => state
  );
  return {
    ready: s.ready,
    usuario: s.user,
    isAdmin: s.user?.nivel === "Admin",
    tenantId: s.tenantId,
    semLoja: Boolean(s.user && !s.tenantId), // logou mas não vinculado a loja
  };
}
