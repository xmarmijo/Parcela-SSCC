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
    const withoutAccount = searchParams.get("withoutAccount") === "true";

    const members = await prisma.familyMember.findMany({
      where: withoutAccount ? { userId: null } : {},
      include: {
        family: { select: { id: true, name: true, owner: { select: { id: true, email: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
