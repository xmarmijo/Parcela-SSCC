import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeRut } from "@/lib/rut";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const userId = session.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    const rut = user.rut ? normalizeRut(user.rut) : null;
    const email = user.email?.toLowerCase() ?? null;

    const matchingMember = await prisma.familyMember.findFirst({
      where: {
        userId: null,
        OR: [
          ...(email ? [{ email }] : []),
          ...(rut ? [{ rut }] : []),
        ],
      },
      include: { family: true },
    });

    if (matchingMember) {
      await prisma.familyMember.update({
        where: { id: matchingMember.id },
        data: { userId },
      });
      if (!matchingMember.family.ownerId) {
        await prisma.family.update({
          where: { id: matchingMember.family.id },
          data: { ownerId: userId },
        });
      }
    }

    return NextResponse.json({ ok: true, linked: !!matchingMember });
  } catch (error) {
    console.error("Error linking family:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
