import { useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { GoldButton, inputCls } from "@/components/ui-kit";
import { authStore } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { supabaseAuth } from "@/lib/supabase/auth";

export function LoginScreen() {
  const backend = isSupabaseConfigured();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [humano, setHumano] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const entrar = async () => {
    if (backend) {
      // Login real (Supabase Auth) — e-mail + senha.
      setCarregando(true);
      const r = await supabaseAuth.signIn(usuario, senha);
      setCarregando(false);
      if (!r.ok) {
        setErro(r.erro === "Invalid login credentials" ? "E-mail ou senha inválidos." : (r.erro ?? "Falha ao entrar."));
        return;
      }
      // sucesso: o AppShell reage à sessão e libera o app.
      return;
    }
    // Trava local (modo sem backend).
    if (!humano) { setErro("Confirme que você não é um robô."); return; }
    if (!authStore.login(usuario, senha)) { setErro("Usuário ou senha inválidos."); return; }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--navy-deep)] px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo-fn.png" alt="FN Cortinas" className="w-16 h-16 object-contain mb-3" />
          <div className="text-gold text-[15px] font-semibold tracking-wide uppercase">FN Cortinas</div>
          <div className="text-[11px] text-[oklch(0.7_0.02_260)] mt-1">Acesso restrito</div>
        </div>

        <div className="surface rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-[13px] font-medium">
            <Lock className="w-4 h-4 text-gold" /> Entrar
          </div>

          <form onSubmit={(e) => { e.preventDefault(); void entrar(); }} className="space-y-3">
            <div>
              <div className="text-[11px] text-muted-foreground mb-1.5">{backend ? "E-mail" : "Usuário"}</div>
              <input
                autoFocus
                className={inputCls}
                value={usuario}
                onChange={(e) => { setUsuario(e.target.value); setErro(""); }}
                placeholder={backend ? "voce@exemplo.com" : "seu usuário"}
                type={backend ? "email" : "text"}
                autoComplete={backend ? "email" : "username"}
              />
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground mb-1.5">Senha</div>
              <input type="password" className={inputCls} value={senha} onChange={(e) => { setSenha(e.target.value); setErro(""); }} placeholder="••••••••" autoComplete="current-password" />
            </div>

            {!backend && (
              <button
                type="button"
                onClick={() => { setHumano((v) => !v); setErro(""); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md border text-[12px] transition-colors ${
                  humano ? "border-[oklch(0.72_0.15_150_/_0.5)] bg-[oklch(0.72_0.15_150_/_0.06)]" : "border-white/[0.08] hover:bg-white/[0.03]"
                }`}
              >
                <span className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${humano ? "bg-[oklch(0.72_0.15_150)] border-[oklch(0.72_0.15_150)]" : "border-white/25"}`}>
                  {humano && <ShieldCheck className="w-3 h-3 text-[var(--navy-deep)]" />}
                </span>
                <span className="text-muted-foreground">Não sou um robô</span>
              </button>
            )}

            {erro && <div className="text-[12px] text-[oklch(0.78_0.14_25)]">{erro}</div>}

            <GoldButton type="submit" className="w-full justify-center" disabled={carregando} onClick={() => void entrar()}>
              {carregando ? "Entrando…" : "Entrar"}
            </GoldButton>
          </form>
        </div>

        <div className="text-[10px] text-[oklch(0.6_0.02_260)] text-center mt-4 leading-relaxed">
          {backend
            ? "Acesso seguro · autenticação e dados protegidos no servidor (Supabase)."
            : "Trava de acesso local · a verificação anti-robô (reCAPTCHA) e a segurança completa entram na versão com servidor."}
        </div>
      </div>
    </div>
  );
}
