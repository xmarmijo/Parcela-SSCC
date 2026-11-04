import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getPaymentClient } from "@/lib/mercadopago";
import { sendConfirmationEmail } from "@/lib/email";

async function runTransaction<T>(
  callback: (tx: typeof prisma) => Promise<T>
): Promise<T> {
  if (typeof (prisma as any).$transaction === "function") {
    return (prisma as any).$transaction(callback);
  }
  return callback(prisma);
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  try {
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      // Body may not be JSON
    }

    const url = new URL(req.url);
    const queryId =
      url.searchParams.get("data.id") ||
      url.searchParams.get("id");

    let paymentId: string | null = null;

    if (body?.data?.id) {
      paymentId = String(body.data.id);
    } else if (body?.id && (body?.type === "payment" || !body?.type)) {
      paymentId = String(body.id);
    } else if (queryId) {
      paymentId = String(queryId);
    }

    // If not a payment notification or no paymentId found, acknowledge and ignore
    if (!paymentId) {
      return NextResponse.json(
        { received: true, ignored: true, reason: "No paymentId found in payload" },
        { status: 200 }
      );
    }

    // Step 1 Idempotency check: see if this providerPaymentId was already approved
    const existingPayment = await prisma.payment.findUnique({
      where: { providerPaymentId: paymentId },
    });

    if (existingPayment && existingPayment.status === "APPROVED") {
      return NextResponse.json(
        {
          message: "Pago ya procesado previamente",
          status: "already_processed",
          paymentId: existingPayment.id,
        },
        { status: 200 }
      );
    }

    // Query Mercado Pago for authoritative payment details
    const paymentClient = getPaymentClient();
    let mpPayment: any;
    try {
      mpPayment = await paymentClient.get({ id: paymentId });
    } catch (err: any) {
      console.error(`Error querying Mercado Pago payment ${paymentId}:`, err);
      return NextResponse.json(
        { error: "No se pudo consultar el pago en Mercado Pago" },
        { status: 502 }
      );
    }

    if (!mpPayment) {
      return NextResponse.json(
        { error: "Pago no encontrado en Mercado Pago" },
        { status: 404 }
      );
    }

    const mpStatus = mpPayment.status;
    const reservationId =
      mpPayment.external_reference ||
      mpPayment.metadata?.reservation_id ||
      mpPayment.metadata?.reservationId;

    // If payment is not approved, update or record status and return
    if (mpStatus !== "approved") {
      if (reservationId) {
        const paymentStatus =
          mpStatus === "rejected" || mpStatus === "cancelled"
            ? "REJECTED"
            : "PENDING";

        if (existingPayment) {
          await prisma.payment.update({
            where: { id: existingPayment.id },
            data: { status: paymentStatus },
          });
        } else {
          await prisma.payment.create({
            data: {
              provider: "mercadopago",
              providerPaymentId: String(mpPayment.id),
              amount: Math.round(Number(mpPayment.transaction_amount || 0)),
              status: paymentStatus,
              reservationId,
            },
          });
        }
      }

      return NextResponse.json(
        { received: true, status: mpStatus, processed: false },
        { status: 200 }
      );
    }

    if (!reservationId) {
      console.error("Pago aprobado pero sin external_reference:", mpPayment.id);
      return NextResponse.json(
        { error: "external_reference (reservationId) ausente en el pago" },
        { status: 400 }
      );
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { qrTokens: true },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: `Reserva ${reservationId} no encontrada` },
        { status: 404 }
      );
    }

    // Execute atomic transaction to confirm reservation, record payment, and generate QR
    const result = await runTransaction(async (tx) => {
      // 1. Payment record
      let paymentRecord;
      if (existingPayment) {
        paymentRecord = await tx.payment.update({
          where: { id: existingPayment.id },
          data: {
            status: "APPROVED",
            paidAt: mpPayment.date_approved
              ? new Date(mpPayment.date_approved)
              : new Date(),
            amount: Math.round(
              Number(mpPayment.transaction_amount ?? reservation.totalAmount)
            ),
          },
        });
      } else {
        // Check if there was an unlinked PENDING payment for this reservation
        const pendingPayment = await tx.payment.findFirst({
          where: {
            reservationId: reservation.id,
            status: "PENDING",
            providerPaymentId: null,
          },
        });

        if (pendingPayment) {
          paymentRecord = await tx.payment.update({
            where: { id: pendingPayment.id },
            data: {
              providerPaymentId: String(mpPayment.id),
              status: "APPROVED",
              paidAt: mpPayment.date_approved
                ? new Date(mpPayment.date_approved)
                : new Date(),
              amount: Math.round(
                Number(mpPayment.transaction_amount ?? reservation.totalAmount)
              ),
            },
          });
        } else {
          paymentRecord = await tx.payment.create({
            data: {
              provider: "mercadopago",
              providerPaymentId: String(mpPayment.id),
              amount: Math.round(
                Number(mpPayment.transaction_amount ?? reservation.totalAmount)
              ),
              status: "APPROVED",
              paidAt: mpPayment.date_approved
                ? new Date(mpPayment.date_approved)
                : new Date(),
              reservationId: reservation.id,
            },
          });
        }
      }

      // 2. Confirm Reservation
      const updatedReservation = await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: "CONFIRMADA" },
      });

      // 3. QR Token (Idempotent: only create if not already present)
      let qrToken = await tx.qrToken.findFirst({
        where: { reservationId: reservation.id },
      });

      if (!qrToken) {
        const token = crypto.randomUUID();
        qrToken = await tx.qrToken.create({
          data: {
            token,
            reservationId: reservation.id,
          },
        });
      }

      return {
        payment: paymentRecord,
        reservation: updatedReservation,
        qrToken,
      };
    });

    // Send confirmation email (Task 6)
    try {
      await sendConfirmationEmail(reservation.id);
    } catch (emailErr) {
      console.error(
        "Error al enviar email de confirmación desde webhook:",
        emailErr
      );
    }

    return NextResponse.json({
      success: true,
      reservationId: reservation.id,
      qrToken: result.qrToken.token,
      paymentId: result.payment.id,
    });
  } catch (error) {
    console.error("Error procesando webhook de pago:", error);
    return NextResponse.json(
      { error: "Error interno al procesar notificación de pago" },
      { status: 500 }
    );
  }
}
