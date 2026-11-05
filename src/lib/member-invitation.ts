import { prisma } from "./prisma";
import { sendEmail } from "./email";

export async function sendMemberInvitationEmail(opts: {
  to: string;
  memberName: string;
  familyName: string;
  titularName: string;
  password?: string;
}): Promise<{ success: boolean; skipped?: boolean; error?: any }> {
  const { to, memberName, familyName, titularName, password } = opts;
  const html = `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;">
      <h2 style="color:#1e3a8a;">Bienvenido/a al núcleo familiar</h2>
      <p>Hola <strong>${memberName}</strong>,</p>
      <p>Has sido agregado/a al núcleo familiar <strong>${familyName}</strong> por ${titularName}.</p>
      <p>Ahora puedes ingresar al sistema de reservas de la Parcela SSCC con tu propia cuenta:</p>
      <ul>
        <li><strong>Correo:</strong> ${to}</li>
        ${password ? `<li><strong>Contraseña inicial:</strong> ${password}</li>` : ""}
      </ul>
      <p style="margin-top:16px;">
        <a href="https://parcelasscc.vercel.app/login" style="display:inline-block;padding:10px 20px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
          Iniciar sesión
        </a>
      </p>
      <p style="color:#64748b;font-size:12px;margin-top:16px;">Parcela SSCC — Sistema de Reservas</p>
    </div>
  `;
  return sendEmail({ to, subject: `Invitación al núcleo familiar ${familyName}`, html });
}
