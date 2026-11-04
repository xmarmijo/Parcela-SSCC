import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPreferenceClient } from "@/lib/mercadopago";
import { getAppUrl } from "@/lib/qr";

const createPreferenceSchema = z.object({
  reservationId: z.string().trim().min(1, "El ID de la reserva es obligatorio"),
});

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    if (session.user.role !== "SOCIO" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Se requiere rol SOCIO o ADMIN" },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Cuerpo de solicitud JSON inválido" },
        { status: 400 }
      );
    }

    const parseResult = createPreferenceSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Datos de entrada inválidos",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { reservationId } = parseResult.data;

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        family: true,
        addOns: {
          include: {
            addOnSpace: true,
          },
        },
        extraPersons: true,
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reserva no encontrada" },
        { status: 404 }
      );
    }

    // Check ownership / permission
    if (session.user.role !== "ADMIN" && reservation.family.ownerId !== session.user.id) {
      const member = await prisma.familyMember.findFirst({
        where: {
          familyId: reservation.familyId,
          userId: session.user.id,
        },
      });

      if (!member) {
        return NextResponse.json(
          { error: "No tienes permiso para pagar esta reserva" },
          { status: 403 }
        );
      }
    }

    if (reservation.status === "CONFIRMADA") {
      return NextResponse.json(
        { error: "La reserva ya se encuentra confirmada" },
        { status: 400 }
      );
    }

    if (reservation.status === "CANCELADA") {
      return NextResponse.json(
        { error: "La reserva está cancelada" },
        { status: 400 }
      );
    }

    // If reservation has 0 cost (no add-ons, no extra guests), confirm directly
    if (reservation.totalAmount <= 0) {
      let qrRecord = await prisma.qrToken.findFirst({
        where: { reservationId: reservation.id },
      });

      if (!qrRecord) {
        qrRecord = await prisma.qrToken.create({
          data: {
            token: crypto.randomUUID(),
            reservationId: reservation.id,
          },
        });
      }

      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: "CONFIRMADA" },
      });

      return NextResponse.json({
        free: true,
        status: "CONFIRMADA",
        reservationId: reservation.id,
        qrToken: qrRecord.token,
      });
    }

    // Create Mercado Pago Preference
    const preferenceClient = getPreferenceClient();
    const appUrl = getAppUrl();

    const formattedDate = reservation.date instanceof Date
      ? reservation.date.toISOString().slice(0, 10)
      : String(reservation.date).slice(0, 10);

    const preference = await preferenceClient.create({
      body: {
        items: [
          {
            id: reservation.id,
            title: `Reserva Parcela SSCC - ${reservation.family.name}`,
            description: `Día de reserva: ${formattedDate}`,
            quantity: 1,
            unit_price: reservation.totalAmount,
            currency_id: "CLP",
          },
        ],
        external_reference: reservation.id,
        notification_url: `${appUrl}/api/payments/webhook`,
        back_urls: {
          success: `${appUrl}/reservas/${reservation.id}?status=approved`,
          failure: `${appUrl}/reservas/${reservation.id}?status=failure`,
          pending: `${appUrl}/reservas/${reservation.id}?status=pending`,
        },
        auto_return: "approved",
        metadata: {
          reservation_id: reservation.id,
          family_id: reservation.familyId,
        },
      },
    });

    // Guardar referencia: crear registro Payment pendiente si no existe
    const existingPendingPayment = await prisma.payment.findFirst({
      where: {
        reservationId: reservation.id,
        status: "PENDING",
      },
    });

    if (!existingPendingPayment) {
      await prisma.payment.create({
        data: {
          provider: "mercadopago",
          amount: reservation.totalAmount,
          status: "PENDING",
          reservationId: reservation.id,
        },
      });
    }

    return NextResponse.json({
      preferenceId: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
    });
  } catch (error) {
    console.error("Error creating payment preference:", error);
    return NextResponse.json(
      { error: "Error interno al crear preferencia de pago" },
      { status: 500 }
    );
  }
}
