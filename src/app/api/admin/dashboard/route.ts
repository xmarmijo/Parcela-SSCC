import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const [familiesCount, usersCount, reservationsToday, reservationsMonth, paymentsMonth, recentReservations, byStatus, allReservations, cancellationsCount, topFamilies] =
      await Promise.all([
        prisma.family.count(),
        prisma.user.count(),
        prisma.reservation.count({ where: { date: startOfDay } }),
        prisma.reservation.count({ where: { date: { gte: startOfMonth } } }),
        prisma.payment.aggregate({
          where: { status: "APPROVED", paidAt: { gte: startOfMonth } },
          _sum: { amount: true },
        }),
        prisma.reservation.findMany({
          take: 10,
          orderBy: { createdAt: "desc" },
          include: { family: { include: { owner: { select: { email: true, rut: true } } } }, extraPersons: true },
        }),
        prisma.reservation.groupBy({
          by: ["status"],
          _count: { _all: true },
        }),
        prisma.reservation.findMany({
          where: { date: { gte: startOfMonth } },
          select: { date: true },
        }),
        prisma.reservation.count({ where: { status: "CANCELADA", createdAt: { gte: startOfMonth } } }),
        prisma.family.findMany({
          take: 5,
          orderBy: { reservations: { _count: "desc" } },
          include: { _count: { select: { reservations: true } }, owner: { select: { email: true } } },
        }),
      ]);

    // Most/least used days of week
    const dayCounts: number[] = [0, 0, 0, 0, 0, 0, 0];
    for (const r of allReservations) {
      dayCounts[r.date.getUTCDay()]++;
    }
    const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const dayStats = dayNames.map((name, i) => ({ day: name, count: dayCounts[i] }));

    return NextResponse.json({
      familiesCount,
      usersCount,
      reservationsToday,
      reservationsMonth,
      incomeMonth: paymentsMonth._sum.amount ?? 0,
      cancellationsMonth: cancellationsCount,
      recentReservations,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
      dayStats,
      topFamilies: topFamilies.map((f) => ({ name: f.name, count: f._count.reservations, email: f.owner?.email })),
    });
  } catch (error) {
    console.error("Error dashboard:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
