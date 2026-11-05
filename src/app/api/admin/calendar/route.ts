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
    const year = parseInt(searchParams.get("year") ?? String(new Date().getUTCFullYear()), 10);
    const month = parseInt(searchParams.get("month") ?? String(new Date().getUTCMonth() + 1), 10);

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0));

    const reservations = await prisma.reservation.findMany({
      where: { date: { gte: start, lte: end } },
      select: { date: true, status: true, family: { select: { name: true } } },
    });

    const counts: Record<string, { total: number; confirmed: number; pending: number; families: string[] }> = {};
    for (const r of reservations) {
      const key = r.date.toISOString().slice(0, 10);
      if (!counts[key]) counts[key] = { total: 0, confirmed: 0, pending: 0, families: [] };
      counts[key].total++;
      if (r.status === "CONFIRMADA" || r.status === "COMPLETADA") counts[key].confirmed++;
      if (r.status === "PENDIENTE_PAGO") counts[key].pending++;
      if (r.family?.name) counts[key].families.push(r.family.name);
    }

    return NextResponse.json({ year, month, counts });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
