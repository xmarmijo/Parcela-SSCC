import { Resend } from "resend";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { generateQrDataUrl, getValidationUrl } from "@/lib/qr";
import {
  renderConfirmacionReservaHtml,
  ConfirmacionReservaEmailProps,
} from "@/emails/confirmacion-reserva";

export function getResendClient(): Resend | null {
  if ((globalThis as any).__mockResend) {
    return (globalThis as any).__mockResend;
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

export async function getTransporter(): Promise<any | null> {
  if ((globalThis as any).__mockTransporter) {
    return (globalThis as any).__mockTransporter;
  }
  let user = process.env.GMAIL_USER;
  let pass = process.env.GMAIL_APP_PASSWORD;
  let from = process.env.EMAIL_FROM;
  if (!user || !pass) {
    try {
      const settings = await prisma.appSetting.findMany({
        where: { key: { in: ["gmail_user", "gmail_app_password", "email_from"] } },
      });
      const map: Record<string, string> = {};
      for (const s of settings) map[s.key] = s.value;
      if (!user) user = map.gmail_user;
      if (!pass) pass = map.gmail_app_password;
      if (!from) from = map.email_from;
    } catch {
      // ignore
    }
  }
  if (!user || !pass) return null;
  (globalThis as any).__cachedGmailFrom = from || user;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<{ success: boolean; skipped?: boolean; reason?: string; error?: any; data?: any }> {
  const transporter = await getTransporter();
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: (globalThis as any).__cachedGmailFrom || process.env.EMAIL_FROM || process.env.GMAIL_USER,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      });
      return { success: true, data: info };
    } catch (err: any) {
      console.error("[Email] Error enviando con Gmail:", err);
      return { success: false, error: err?.message || String(err) };
    }
  }
  const resend = getResendClient();
  if (resend) {
    try {
      const response = await resend.emails.send({
        from: process.env.EMAIL_FROM || "Parcela SSCC <onboarding@resend.dev>",
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      });
      if ((response as any)?.error) {
        return { success: false, error: (response as any).error };
      }
      return { success: true, data: (response as any)?.data || response };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }
  return { success: false, skipped: true, reason: "NO_EMAIL_PROVIDER" };
}

export interface SendConfirmationEmailResult {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  error?: any;
  data?: any;
}

export async function sendConfirmationEmail(
  reservationOrId: string | any
): Promise<SendConfirmationEmailResult> {
  try {
    let reservation: any = reservationOrId;

    if (typeof reservationOrId === "string") {
      reservation = await prisma.reservation.findUnique({
        where: { id: reservationOrId },
        include: {
          family: {
            include: {
              owner: true,
            },
          },
          addOns: {
            include: {
              addOnSpace: true,
            },
          },
          extraPersons: true,
          payments: true,
          qrTokens: true,
        },
      });
    } else if (
      reservation &&
      reservation.id &&
      (!reservation.family?.owner || !reservation.qrTokens)
    ) {
      // If incomplete reservation object passed, try to hydrate relations if prisma available
      try {
        const fullRecord = await prisma.reservation.findUnique({
          where: { id: reservation.id },
          include: {
            family: {
              include: {
                owner: true,
              },
            },
            addOns: {
              include: {
                addOnSpace: true,
              },
            },
            extraPersons: true,
            payments: true,
            qrTokens: true,
          },
        });
        if (fullRecord) {
          reservation = fullRecord;
        }
      } catch {
        // Use the object as provided
      }
    }

    if (!reservation) {
      console.warn("[Email] No se encontró la reserva para enviar confirmación");
      return { success: false, error: "RESERVATION_NOT_FOUND" };
    }

    const recipientEmail =
      reservation.family?.owner?.email ||
      reservation.customerEmail ||
      reservation.email ||
      reservation.user?.email;

    if (!recipientEmail) {
      console.warn(
        `[Email] Reserva ${reservation.id} sin email de titular para notificación.`
      );
      return { success: false, error: "NO_RECIPIENT_EMAIL" };
    }

    // Determine QR token
    let qrToken =
      reservation.qrTokens?.[0]?.token ||
      reservation.qrToken?.token ||
      (typeof reservation.qrToken === "string" ? reservation.qrToken : null);

    if (!qrToken && reservation.id) {
      const qrRecord = await prisma.qrToken.findFirst({
        where: { reservationId: reservation.id },
      });
      if (qrRecord) {
        qrToken = qrRecord.token;
      }
    }

    if (!qrToken) {
      console.warn(
        `[Email] Reserva ${reservation.id} no posee token QR asociado.`
      );
      return { success: false, error: "NO_QR_TOKEN" };
    }

    const qrDataUrl = await generateQrDataUrl(qrToken);
    const validationUrl = getValidationUrl(qrToken);

    // Format date in Spanish (Chile)
    let dateFormatted = String(reservation.date);
    try {
      const d =
        typeof reservation.date === "string"
          ? new Date(reservation.date)
          : reservation.date;
      if (d && !isNaN(d.getTime())) {
        dateFormatted = d.toLocaleDateString("es-CL", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: "UTC",
        });
      }
    } catch {
      // Keep string representation
    }

    // Format spaces list
    const spacesList: string[] = (reservation.addOns || []).map((a: any) => {
      const name = a.addOnSpace?.name || a.name || "Espacio";
      const qty = a.quantity && a.quantity > 1 ? ` (${a.quantity})` : "";
      return `${name}${qty}`;
    });

    // Format extra guests list
    const extraGuests = (reservation.extraPersons || []).map((p: any) => ({
      fullName: p.fullName || "Invitado",
      usesPool: Boolean(p.usesPool),
    }));

    // Format total amount
    const approvedPayment = (reservation.payments || []).find(
      (p: any) => p.status === "APPROVED"
    );
    const totalAmount =
      approvedPayment?.amount ?? reservation.totalAmount ?? 0;
    const totalAmountFormatted = `$${Number(totalAmount).toLocaleString("es-CL")} CLP`;

    const familyName = reservation.family?.name || "Familia Parcela SSCC";
    const titularName =
      reservation.family?.owner?.name ||
      reservation.family?.name ||
      recipientEmail;

    const emailProps: ConfirmacionReservaEmailProps = {
      reservationId: reservation.id,
      familyName,
      titularName,
      dateFormatted,
      spacesList,
      extraGuests,
      totalAmountFormatted,
      qrToken,
      qrDataUrl,
      validationUrl,
    };

    const html = renderConfirmacionReservaHtml(emailProps);
    const subject = `Confirmación de Reserva - ${familyName} (${dateFormatted})`;

    const result = await sendEmail({ to: recipientEmail, subject, html });
    if (!result.success) {
      if (result.skipped) {
        console.warn(
          `[Email] Sin proveedor de correo configurado. Omitiendo envío para reserva ${reservation.id}.`
        );
      } else {
        console.error(
          `[Email] Error enviando confirmación a ${recipientEmail}:`,
          result.error
        );
      }
    }
    return result;
  } catch (error: any) {
    console.error("[Email] Error inesperado en sendConfirmationEmail:", error);
    return { success: false, error: error?.message || String(error) };
  }
}
