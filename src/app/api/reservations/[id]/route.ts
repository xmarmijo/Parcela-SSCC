import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateTotal } from "@/lib/pricing";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function GET(req: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const { id } = await Promise.resolve(context.params);

    if (!id) {
      return NextResponse.json(
        { error: "ID de reserva requerido" },
        { status: 400 }
      );
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        family: true,
        extraPersons: true,
        addOns: {
          include: {
            addOnSpace: true,
          },
        },
        payments: true,
        qrTokens: true,
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reserva no encontrada" },
        { status: 404 }
      );
    }

    // Permission check
    if (session.user.role !== "ADMIN") {
      const isOwner = reservation.family.ownerId === session.user.id;
      if (!isOwner) {
        const isMember = await prisma.familyMember.findFirst({
          where: {
            familyId: reservation.familyId,
            userId: session.user.id,
          },
        });
        if (!isMember) {
          return NextResponse.json(
            { error: "No tienes permiso para ver esta reserva" },
            { status: 403 }
          );
        }
      }
    }

    return NextResponse.json(reservation);
  } catch (error) {
    console.error("Error fetching reservation by id:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { id } = await Promise.resolve(context.params);
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { family: true, extraPersons: true, addOns: true },
    });
    if (!reservation) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    if (session.user.role !== "ADMIN" && reservation.family.ownerId !== session.user.id) {
      const member = await prisma.familyMember.findFirst({ where: { familyId: reservation.familyId, userId: session.user.id } });
      if (!member) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }
    if (reservation.status !== "PENDIENTE_PAGO" && reservation.status !== "CONFIRMADA") {
      return NextResponse.json({ error: "Solo se pueden editar reservas pendientes de pago o confirmadas" }, { status: 400 });
    }

    const body = await req.json();
    const availableSpaces = await prisma.addOnSpace.findMany();

    // Rebuild extra persons
    if (Array.isArray(body.extraPersons)) {
      // delete existing
      await prisma.extraPerson.deleteMany({ where: { reservationId: id } });
      for (const p of body.extraPersons) {
        await prisma.extraPerson.create({
          data: {
            reservationId: id,
            fullName: p.fullName,
            rut: p.rut ? p.rut.trim() : null,
            isSocio: Boolean(p.isSocio),
            usesPool: Boolean(p.usesPool),
          },
        });
      }
    }

    // Rebuild add-ons
    if (Array.isArray(body.addOns)) {
      await prisma.reservationAddOn.deleteMany({ where: { reservationId: id } });
      for (const a of body.addOns) {
        const matched = availableSpaces.find((s) => s.id === a.addOnSpaceId || s.name === a.addOnSpaceId);
        await prisma.reservationAddOn.create({
          data: {
            reservationId: id,
            addOnSpaceId: matched ? matched.id : a.addOnSpaceId,
            quantity: a.quantity ?? 1,
          },
        });
      }
    }

    // Recalculate total
    const updated = await prisma.reservation.findUnique({
      where: { id },
      include: { extraPersons: true, addOns: { include: { addOnSpace: true } } },
    });
    const totalAmount = calculateTotal(
      {
        extraPersons: (updated?.extraPersons ?? []).map((p) => ({ fullName: p.fullName, rut: p.rut, isSocio: p.isSocio, usesPool: p.usesPool })),
        addOns: (updated?.addOns ?? []).map((a) => ({ addOnSpaceId: a.addOnSpaceId, name: a.addOnSpace?.name, quantity: a.quantity, pricePerUnit: a.addOnSpace?.pricePerUnit })),
      },
      { addOnSpaces: availableSpaces }
    );
    await prisma.reservation.update({ where: { id }, data: { totalAmount } });

    const final = await prisma.reservation.findUnique({
      where: { id },
      include: { family: true, extraPersons: true, addOns: { include: { addOnSpace: true } }, payments: true, qrTokens: true },
    });
    return NextResponse.json(final);
  } catch (error) {
    console.error("Error updating reservation:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const { id } = await Promise.resolve(context.params);

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { family: true },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reserva no encontrada" },
        { status: 404 }
      );
    }

    if (session.user.role !== "ADMIN" && reservation.family.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "No tienes permiso para cancelar esta reserva" },
        { status: 403 }
      );
    }

    if (reservation.status !== "PENDIENTE_PAGO") {
      return NextResponse.json(
        { error: "Solo se pueden cancelar reservas en estado PENDIENTE_PAGO" },
        { status: 400 }
      );
    }

    const updated = await prisma.reservation.update({
      where: { id },
      data: { status: "CANCELADA" },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error cancelling reservation:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
