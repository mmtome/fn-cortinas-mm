// Camada única de autenticação para a UI.
// - Sem backend  → usa a trava local (comportamento atual, inalterado).
// - Com Supabase → usa login real (Supabase Auth) + loja (tenant) + papel.
// Os dois hooks são sempre chamados (regras dos hooks), mas só um vale.

import { useAuth as useLocalAuth, authStore } from "./auth";
import { useSupabaseAuth, supabaseAuth } from "./supabase/auth";
import { isSupabaseConfigured } from "./supabase/client";

export interface AppAuth {
  mode: "local" | "supabase";
  ready: boolean;                 // já sabemos se há sessão
  usuario: { nome: string; nivel: "Admin" | "Operador" } | null;
  isAdmin: boolean;
  semLoja: boolean;               // logou mas não está vinculado a nenhuma loja
  logout: () => void | Promise<void>;
}

export function useAppAuth(): AppAuth {
  const local = useLocalAuth();
  const sb = useSupabaseAuth();

  if (isSupabaseConfigured()) {
    return {
      mode: "supabase",
      ready: sb.ready,
      usuario: sb.usuario ? { nome: sb.usuario.nome, nivel: sb.usuario.nivel } : null,
      isAdmin: sb.isAdmin,
      semLoja: sb.semLoja,
      logout: () => supabaseAuth.signOut(),
    };
  }

  return {
    mode: "local",
    ready: true,
    usuario: local.usuario ? { nome: local.usuario.nome, nivel: local.usuario.nivel } : null,
    isAdmin: local.isAdmin,
    semLoja: false,
    logout: () => authStore.logout(),
  };
}
