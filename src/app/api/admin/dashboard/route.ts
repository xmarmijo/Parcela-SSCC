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

    const [familiesCount, usersCount, reservationsToday, reservationsMonth, paymentsMonth, recentReservations, byStatus] =
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
          include: { family: true, extraPersons: true },
        }),
        prisma.reservation.groupBy({
          by: ["status"],
          _count: { _all: true },
        }),
      ]);

    return NextResponse.json({
      familiesCount,
      usersCount,
      reservationsToday,
      reservationsMonth,
      incomeMonth: paymentsMonth._sum.amount ?? 0,
      recentReservations,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
    });
  } catch (error) {
    console.error("Error dashboard:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
