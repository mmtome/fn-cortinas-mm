import QRCode from "qrcode";

/**
 * Gera um QR Code (PNG data URL) que abre o WhatsApp do número informado.
 * Retorna null se o número estiver vazio ou a geração falhar.
 * O data URL serve tanto para <img> na tela quanto para o jsPDF (addImage).
 */
export async function gerarQRWhatsApp(
  numero: string,
  opts?: { width?: number; dark?: string; light?: string }
): Promise<string | null> {
  const digits = (numero || "").replace(/\D/g, "");
  if (!digits) return null;
  try {
    return await QRCode.toDataURL(`https://wa.me/${digits}`, {
      margin: 1,
      width: opts?.width ?? 240,
      color: { dark: opts?.dark ?? "#101828", light: opts?.light ?? "#ffffff" },
    });
  } catch {
    return null;
  }
}
