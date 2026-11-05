import { prisma } from "./prisma";
import { sendEmail } from "./email";

export async function sendReminderEmails(): Promise<{ sent: number; skipped: number; errors: number }> {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const dayAfter = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2));

  const reservations = await prisma.reservation.findMany({
    where: {
      status: "CONFIRMADA",
      remindedAt: null,
      date: { gte: tomorrow, lte: dayAfter },
    },
    include: {
      family: { include: { owner: true } },
      addOns: { include: { addOnSpace: true } },
      extraPersons: true,
    },
  });

  let sent = 0, skipped = 0, errors = 0;
  for (const r of reservations) {
    const email = r.family?.owner?.email;
    if (!email) { skipped++; continue; }
    const dateStr = r.date.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    const spaces = r.addOns.map((a: any) => a.addOnSpace?.name || "Espacio").join(", ") || "Uso general de parcela";
    const html = `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;">
        <h2 style="color:#1e3a8a;">Recordatorio de reserva</h2>
        <p>Hola, te recordamos que tienes una reserva en la Parcela SSCC:</p>
        <ul>
          <li><strong>Fecha:</strong> ${dateStr}</li>
          <li><strong>Familia:</strong> ${r.family?.name ?? ""}</li>
          <li><strong>Espacios:</strong> ${spaces}</li>
          <li><strong>Total:</strong> $${Number(r.totalAmount).toLocaleString("es-CL")} CLP</li>
        </ul>
        <p>¡Te esperamos!</p>
        <p style="color:#64748b;font-size:12px;">Parcela SSCC</p>
      </div>
    `;
    const result = await sendEmail({ to: email, subject: `Recordatorio: reserva ${dateStr}`, html });
    if (result.success) {
      await prisma.reservation.update({ where: { id: r.id }, data: { remindedAt: new Date() } });
      sent++;
    } else if (result.skipped) {
      skipped++;
    } else {
      errors++;
    }
  }
  return { sent, skipped, errors };
}

export async function sendFineEmail(fineId: string): Promise<{ success: boolean; skipped?: boolean; error?: any }> {
  const fine = await prisma.fine.findUnique({
    where: { id: fineId },
    include: { family: { include: { owner: true } }, familyMember: true, issuedBy: true },
  });
  if (!fine) return { success: false, error: "FINE_NOT_FOUND" };
  const email = fine.family?.owner?.email;
  if (!email) return { success: false, skipped: true, error: "NO_RECIPIENT" };

  const html = `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;">
      <h2 style="color:#dc2626;">Notificación de multa</h2>
      <p>Hola, se ha emitido una multa a tu familia:</p>
      <ul>
        <li><strong>Familia:</strong> ${fine.family?.name ?? ""}</li>
        ${fine.familyMember ? `<li><strong>Integrante:</strong> ${fine.familyMember.fullName}</li>` : ""}
        <li><strong>Motivo:</strong> ${fine.reason}</li>
        <li><strong>Monto:</strong> $${Number(fine.amount).toLocaleString("es-CL")} CLP</li>
      </ul>
      <p>Por favor regulariza esta situación con la administración.</p>
      <p style="color:#64748b;font-size:12px;">Parcela SSCC</p>
    </div>
  `;
  return sendEmail({ to: email, subject: `Multa emitida - ${fine.family?.name}`, html });
}

export async function sendWeeklySummaryEmail(): Promise<{ success: boolean; skipped?: boolean; error?: any }> {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
  if (admins.length === 0) return { success: false, skipped: true, error: "NO_ADMIN" };

  const now = new Date();
  const weekAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7));

  const [reservations, payments, fines] = await Promise.all([
    prisma.reservation.findMany({ where: { createdAt: { gte: weekAgo } }, include: { family: true } }),
    prisma.payment.findMany({ where: { status: "APPROVED", paidAt: { gte: weekAgo } } }),
    prisma.fine.findMany({ where: { createdAt: { gte: weekAgo } }, include: { family: true } }),
  ]);

  const income = payments.reduce((s, p) => s + p.amount, 0);
  const pendingFines = fines.filter((f) => !f.paidAt).length;

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <h2 style="color:#1e3a8a;">Resumen semanal — Parcela SSCC</h2>
      <p>Resumen de la última semana:</p>
      <ul>
        <li><strong>Reservas creadas:</strong> ${reservations.length}</li>
        <li><strong>Ingresos (pagos aprobados):</strong> $${income.toLocaleString("es-CL")} CLP</li>
        <li><strong>Multas emitidas:</strong> ${fines.length}</li>
        <li><strong>Multas pendientes:</strong> ${pendingFines}</li>
      </ul>
      <h3>Reservas recientes</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><th style="text-align:left;border-bottom:1px solid #e2e8f0;padding:4px;">Familia</th><th style="text-align:left;border-bottom:1px solid #e2e8f0;padding:4px;">Fecha</th><th style="text-align:left;border-bottom:1px solid #e2e8f0;padding:4px;">Estado</th></tr>
        ${reservations.slice(0, 20).map((r) => `<tr><td style="padding:4px;">${r.family?.name ?? ""}</td><td style="padding:4px;">${r.date.toISOString().slice(0, 10)}</td><td style="padding:4px;">${r.status}</td></tr>`).join("")}
      </table>
      <p style="color:#64748b;font-size:12px;margin-top:16px;">Parcela SSCC</p>
    </div>
  `;

  let last: any = { success: false, skipped: true };
  for (const admin of admins) {
    if (admin.email) {
      last = await sendEmail({ to: admin.email, subject: "Resumen semanal — Parcela SSCC", html });
    }
  }
  return last;
}
