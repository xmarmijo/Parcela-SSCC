import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const rut = searchParams.get("rut")?.trim();
    const status = searchParams.get("status")?.trim();
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = 20;
    const where: any = {};
    if (date) {
      const d = new Date(date + "T00:00:00.000Z");
      where.date = d;
    }
    if (status) {
      where.status = status;
    }
    if (rut) {
      const normalized = rut.replace(/\./g, "").replace(/\s/g, "").toUpperCase();
      const family = await prisma.family.findFirst({
        where: { owner: { rut: normalized } },
      });
      if (family) where.familyId = family.id;
      else where.familyId = "__none__";
    }
    const [total, reservations] = await Promise.all([
      prisma.reservation.count({ where }),
      prisma.reservation.findMany({
        where,
        include: { family: true, extraPersons: true, addOns: { include: { addOnSpace: true } }, payments: true },
        orderBy: { date: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return NextResponse.json({ total, page, pageSize, reservations });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const body = await req.json();
    const { id, action } = body;
    if (action === "cancel") {
      const reservation = await prisma.reservation.findUnique({ where: { id } });
      if (!reservation) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
      if (reservation.status === "COMPLETADA") {
        return NextResponse.json({ error: "No se puede cancelar una reserva completada" }, { status: 400 });
      }
      await prisma.reservation.update({ where: { id }, data: { status: "CANCELADA" } });
      return NextResponse.json({ ok: true });
    }

    if (action === "confirm") {
      const reservation = await prisma.reservation.findUnique({ where: { id }, include: { qrTokens: true } });
      if (!reservation) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
      if (reservation.status === "CANCELADA") {
        return NextResponse.json({ error: "No se puede confirmar una reserva cancelada" }, { status: 400 });
      }
      if (reservation.status === "CONFIRMADA" || reservation.status === "COMPLETADA") {
        return NextResponse.json({ ok: true, alreadyConfirmed: true });
      }

      // Create payment record + confirm + QR (idempotent)
      await prisma.$transaction(async (tx) => {
        const pendingPayment = await tx.payment.findFirst({
          where: { reservationId: reservation.id, status: "PENDING", providerPaymentId: null },
        });
        if (pendingPayment) {
          await tx.payment.update({
            where: { id: pendingPayment.id },
            data: { status: "APPROVED", paidAt: new Date(), amount: reservation.totalAmount },
          });
        } else {
          await tx.payment.create({
            data: {
              provider: "manual",
              providerPaymentId: `manual-${Date.now()}`,
              amount: reservation.totalAmount,
              status: "APPROVED",
              paidAt: new Date(),
              reservationId: reservation.id,
            },
          });
        }
        await tx.reservation.update({ where: { id }, data: { status: "CONFIRMADA" } });
        const existingQr = await tx.qrToken.findFirst({ where: { reservationId: reservation.id } });
        if (!existingQr) {
          await tx.qrToken.create({ data: { token: crypto.randomUUID(), reservationId: reservation.id } });
        }
      });

      // Send confirmation email (best effort)
      try {
        const { sendConfirmationEmail } = await import("@/lib/email");
        sendConfirmationEmail(reservation.id).catch((e) => console.error("Error email:", e));
      } catch (e) {
        console.error("Error importando email:", e);
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
