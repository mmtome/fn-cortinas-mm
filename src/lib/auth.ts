import { useSyncExternalStore } from "react";

// ⚠️ TRAVA SIMPLES — NÃO é segurança real.
// As credenciais ficam no localStorage do navegador (texto puro) e podem ser
// contornadas por qualquer pessoa com conhecimento técnico. Serve só para
// "manter fora quem não deve mexer" até implementarmos o backend (senha com
// hash, sessão no servidor e reCAPTCHA validado no servidor).

export type Nivel = "Admin" | "Operador";

export interface Usuario {
  id: string;
  nome: string;
  usuario: string; // login
  senha: string;   // texto puro (trava simples)
  nivel: Nivel;
}

const AUTH_KEY = "fn-cortinas:auth:v2";

type AuthState = { usuarios: Usuario[]; sessaoId: string | null };

function seedUsuarios(): Usuario[] {
  return [{ id: "u1", nome: "Administrador", usuario: "fncortinas", senha: "12345678910", nivel: "Admin" }];
}

function load(): AuthState {
  if (typeof window === "undefined") return { usuarios: seedUsuarios(), sessaoId: null };
  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    if (!raw) return { usuarios: seedUsuarios(), sessaoId: null };
    const saved = JSON.parse(raw) as Partial<AuthState>;
    const usuarios = saved.usuarios && saved.usuarios.length ? saved.usuarios : seedUsuarios();
    return { usuarios, sessaoId: saved.sessaoId ?? null };
  } catch {
    return { usuarios: seedUsuarios(), sessaoId: null };
  }
}

let state: AuthState = load();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function persist() {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(AUTH_KEY, JSON.stringify(state)); } catch { /* ignora */ }
}
function commit(next: AuthState) { state = next; persist(); emit(); }

const uid = () => "u" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);

export const authStore = {
  subscribe: (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); },
  get: () => state,

  login: (usuario: string, senha: string): boolean => {
    const alvo = usuario.trim().toLowerCase();
    const u = state.usuarios.find((x) => x.usuario.trim().toLowerCase() === alvo && x.senha === senha);
    if (!u) return false;
    commit({ ...state, sessaoId: u.id });
    return true;
  },
  logout: () => commit({ ...state, sessaoId: null }),

  addUsuario: (u: Omit<Usuario, "id">) =>
    commit({ ...state, usuarios: [...state.usuarios, { ...u, id: uid() }] }),
  updateUsuario: (id: string, patch: Partial<Usuario>) =>
    commit({ ...state, usuarios: state.usuarios.map((u) => (u.id === id ? { ...u, ...patch } : u)) }),
  /** Remove um usuário — mas nunca deixa o sistema sem nenhum Admin. */
  removeUsuario: (id: string): boolean => {
    const rest = state.usuarios.filter((u) => u.id !== id);
    if (!rest.some((u) => u.nivel === "Admin")) return false;
    commit({ ...state, usuarios: rest, sessaoId: state.sessaoId === id ? null : state.sessaoId });
    return true;
  },
  usuarioExiste: (login: string, ignoreId?: string) =>
    state.usuarios.some((u) => u.usuario.trim().toLowerCase() === login.trim().toLowerCase() && u.id !== ignoreId),
};

export function useAuth() {
  const s = useSyncExternalStore(authStore.subscribe, () => state, () => state);
  const usuario = s.usuarios.find((u) => u.id === s.sessaoId) ?? null;
  return { usuarios: s.usuarios, usuario, isAdmin: usuario?.nivel === "Admin" };
}
