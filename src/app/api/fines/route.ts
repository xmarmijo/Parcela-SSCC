import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    // Find family for user
    let familyId: string | null = null;
    const owned = await prisma.family.findUnique({ where: { ownerId: session.user.id } });
    if (owned) familyId = owned.id;
    else {
      const member = await prisma.familyMember.findFirst({ where: { userId: session.user.id } });
      if (member) familyId = member.familyId;
    }
    if (!familyId) {
      return NextResponse.json([]);
    }
    const fines = await prisma.fine.findMany({
      where: { familyId },
      include: { familyMember: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(fines);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
