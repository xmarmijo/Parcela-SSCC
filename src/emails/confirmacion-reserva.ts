/**
 * Plantilla HTML del correo de confirmación de reserva.
 *
 * Se genera como string plano (sin React ni react-dom/server) para que pueda
 * importarse desde route handlers y componentes de servidor sin romper el
 * build de Next.js/Turbopack.
 */

export interface ConfirmacionReservaEmailProps {
  reservationId: string;
  familyName: string;
  titularName: string;
  dateFormatted: string;
  spacesList: string[];
  extraGuests: Array<{ fullName: string; rut?: string | null; usesPool: boolean }>;
  totalAmountFormatted: string;
  qrToken: string;
  qrDataUrl: string;
  validationUrl: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderConfirmacionReservaHtml({
  reservationId,
  familyName,
  titularName,
  dateFormatted,
  spacesList,
  extraGuests,
  totalAmountFormatted,
  qrToken,
  qrDataUrl,
  validationUrl,
}: ConfirmacionReservaEmailProps): string {
  const spacesText = escapeHtml(
    spacesList.length > 0 ? spacesList.join(", ") : "Uso general de parcela"
  );

  const extraGuestsText = escapeHtml(
    extraGuests.length > 0
      ? extraGuests
          .map(
            (g) =>
              `${g.fullName}${g.rut ? ` (${g.rut})` : ""}${
                g.usesPool ? " (con piscina)" : ""
              }`
          )
          .join(", ")
      : "Sin invitados extra"
  );

  const content = `
    <div style="background-color:#f8fafc;padding:30px 15px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;line-height:1.5;">
      <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background-color:#1e3a8a;padding:24px 32px;text-align:center;">
          <span style="color:#93c5fd;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Parcela SSCC</span>
          <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:8px 0 0 0;">&iexcl;Reserva Confirmada!</h1>
        </div>

        <div style="padding:32px;">
          <p style="font-size:16px;margin:0 0 16px 0;">Hola <strong>${escapeHtml(titularName)}</strong>,</p>
          <p style="font-size:15px;color:#475569;margin:0 0 24px 0;">
            El pago de tu reserva para la <strong>${escapeHtml(familyName)}</strong> ha sido
            procesado exitosamente. A continuaci&oacute;n encontrar&aacute;s el resumen de tu
            visita y tu pase de acceso con c&oacute;digo QR.
          </p>

          <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:28px;">
            <h3 style="font-size:14px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;margin:0 0 16px 0;">Detalles de la Reserva</h3>

            <div style="margin-bottom:12px;">
              <span style="color:#64748b;font-size:14px;">Fecha: </span>
              <strong style="color:#1e293b;font-size:15px;">${escapeHtml(dateFormatted)}</strong>
            </div>

            <div style="margin-bottom:12px;">
              <span style="color:#64748b;font-size:14px;">Familia: </span>
              <strong style="color:#1e293b;font-size:15px;">${escapeHtml(familyName)}</strong>
            </div>

            <div style="margin-bottom:12px;">
              <span style="color:#64748b;font-size:14px;">Espacios reservados: </span>
              <strong style="color:#1e293b;font-size:15px;">${spacesText}</strong>
            </div>

            <div style="margin-bottom:12px;">
              <span style="color:#64748b;font-size:14px;">Invitados extra: </span>
              <strong style="color:#1e293b;font-size:15px;">${extraGuestsText}</strong>
            </div>

            <div style="padding-top:12px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
              <span style="color:#64748b;font-size:14px;">Monto pagado:</span>
              <strong style="color:#15803d;font-size:18px;font-weight:700;">${escapeHtml(totalAmountFormatted)}</strong>
            </div>
          </div>

          <div style="background-color:#f1f5f9;border:1px solid #cbd5e1;border-radius:10px;padding:24px;text-align:center;margin-bottom:28px;">
            <h2 style="font-size:18px;font-weight:700;color:#1e293b;margin:0 0 6px 0;">Tu Pase de Acceso QR</h2>
            <p style="font-size:13px;color:#64748b;margin:0 0 16px 0;">
              Presenta este c&oacute;digo al ingresar en porter&iacute;a. Cada pase es de uso
              &uacute;nico para tu grupo familiar.
            </p>

            <div style="margin:16px auto;">
              <img src="${escapeHtml(qrDataUrl)}" alt="C&oacute;digo QR de Acceso" width="220" height="220" style="display:block;margin:0 auto;border-radius:8px;border:1px solid #e2e8f0;background-color:#ffffff;padding:8px;" />
            </div>

            <div style="font-size:12px;color:#64748b;font-family:monospace;margin:12px 0;word-break:break-all;">Token: ${escapeHtml(qrToken)}</div>

            <div>
              <a href="${escapeHtml(validationUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#1e3a8a;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;font-weight:600;">Ver pase en l&iacute;nea</a>
            </div>
          </div>

          <div style="font-size:13px;color:#64748b;line-height:1.6;">
            <p style="margin:0 0 8px 0;"><strong>Importante para tu visita:</strong></p>
            <ul style="padding-left:20px;margin:0 0 16px 0;">
              <li>La reserva corresponde a la jornada completa del d&iacute;a seleccionado.</li>
              <li>Conserva este correo o guarda el c&oacute;digo QR en tu tel&eacute;fono m&oacute;vil.</li>
              <li>El uso de la piscina aplica &uacute;nicamente para personas autorizadas.</li>
            </ul>
          </div>
        </div>

        <div style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;font-size:12px;color:#94a3b8;">
          <p style="margin:0 0 4px 0;">Parcela SSCC &bull; Colegio Sagrados Corazones</p>
          <p style="margin:0;">ID de Reserva: <span style="font-family:monospace;">${escapeHtml(reservationId)}</span></p>
        </div>
      </div>
    </div>
  `;

  return `<!DOCTYPE html>\n<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Confirmación de Reserva</title></head><body style="margin:0;padding:0;background-color:#f8fafc;">${content}</body></html>`;
}
