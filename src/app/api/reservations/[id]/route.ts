import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
