import { NextResponse } from "next/server";
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
    const where: any = {};
    if (date) {
      const d = new Date(date + "T00:00:00.000Z");
      where.date = d;
    }
    const reservations = await prisma.reservation.findMany({
      where,
      include: { family: true, extraPersons: true, addOns: { include: { addOnSpace: true } }, payments: true },
      orderBy: { date: "asc" },
    });
    return NextResponse.json(reservations);
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
    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
