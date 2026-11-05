import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req?: Request) {
  const request = req ?? new Request("http://localhost:3000/api/addon-spaces");
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");

    const spaces = await prisma.addOnSpace.findMany({ orderBy: { name: "asc" } });

    // Determine target family for the current user
    let targetFamilyId: string | null = null;
    const owned = await prisma.family.findUnique({ where: { ownerId: session.user.id } });
    if (owned) targetFamilyId = owned.id;
    else {
      const member = await prisma.familyMember.findFirst({ where: { userId: session.user.id } });
      if (member) targetFamilyId = member.familyId;
    }

    let bookingCounts: Record<string, number> = {};
    let familyBooked: Record<string, boolean> = {};
    if (dateStr) {
      const d = new Date(dateStr + "T00:00:00.000Z");
      const addOns = await prisma.reservationAddOn.findMany({
        where: { reservation: { date: d, status: { not: "CANCELADA" } } },
        include: { reservation: true },
      });
      for (const a of addOns) {
        bookingCounts[a.addOnSpaceId] = (bookingCounts[a.addOnSpaceId] ?? 0) + a.quantity;
        if (targetFamilyId && a.reservation.familyId === targetFamilyId) {
          familyBooked[a.addOnSpaceId] = true;
        }
      }
    }

    const enriched = spaces.map((s) => {
      const booked = bookingCounts[s.id] ?? 0;
      const available = s.dailyLimit != null ? Math.max(0, s.dailyLimit - booked) : null;
      return {
        ...s,
        bookedToday: booked,
        availableToday: available,
        familyAlreadyBooked: familyBooked[s.id] ?? false,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Error fetching add-on spaces:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
