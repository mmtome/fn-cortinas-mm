import QRCode from "qrcode";

/** Resolve o valor do WhatsApp (link wa.me OU número com DDD) para uma URL. */
export function whatsappUrl(valor: string): string {
  const v = (valor || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;            // já é um link (wa.me/message/…)
  const d = v.replace(/\D/g, "");                   // número → wa.me/<digitos>
  return d ? `https://wa.me/${d}` : "";
}

/**
 * Gera um QR Code (PNG data URL) que abre o WhatsApp.
 * Aceita link (wa.me/message/…) ou número. Retorna null se vazio/inválido.
 */
export async function gerarQRWhatsApp(
  valor: string,
  opts?: { width?: number; dark?: string; light?: string }
): Promise<string | null> {
  const url = whatsappUrl(valor);
  if (!url) return null;
  try {
    return await QRCode.toDataURL(url, {
      margin: 1,
      width: opts?.width ?? 240,
      color: { dark: opts?.dark ?? "#101828", light: opts?.light ?? "#ffffff" },
    });
  } catch {
    return null;
  }
}
