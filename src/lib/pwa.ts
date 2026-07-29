// Registro do Service Worker (PWA offline).
// Só em produção — em dev o SW atrapalharia o HMR do Vite.
let registered = false;

export function registerSW() {
  if (registered || typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  registered = true;

  // Em desenvolvimento, garante que nenhum SW antigo fique servindo cache velho.
  if (!import.meta.env.PROD) {
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
    return;
  }

  const register = () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // Nova versão encontrada → assim que instalar, ativa na hora.
        reg.addEventListener("updatefound", () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener("statechange", () => {
            if (sw.state === "installed" && navigator.serviceWorker.controller) {
              sw.postMessage("SKIP_WAITING");
            }
          });
        });
      })
      .catch(() => {
        /* registro falhou — app segue funcionando online normalmente */
      });

    // Quando o novo SW assume o controle, recarrega uma única vez.
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  };

  // IMPORTANTE: o evento "load" pode já ter disparado quando este código roda
  // (o React monta depois). Registrar mesmo assim, senão o SW nunca instala.
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
