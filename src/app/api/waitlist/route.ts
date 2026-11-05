import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const entries = await prisma.waitlistEntry.findMany({
      include: { family: { select: { id: true, name: true, owner: { select: { email: true } } } } },
      orderBy: { date: "asc" },
    });
    return NextResponse.json(entries);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (session.user.role !== "SOCIO" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Se requiere rol SOCIO o ADMIN" }, { status: 403 });
    }
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    // Determine target family
    let targetFamilyId: string | null = null;
    const owned = await prisma.family.findUnique({ where: { ownerId: session.user.id } });
    if (owned) targetFamilyId = owned.id;
    else {
      const member = await prisma.familyMember.findFirst({ where: { userId: session.user.id } });
      if (member) targetFamilyId = member.familyId;
    }
    if (!targetFamilyId) {
      return NextResponse.json({ error: "El usuario no tiene una familia registrada" }, { status: 400 });
    }

    const d = new Date(parsed.data.date + "T00:00:00.000Z");
    const entry = await prisma.waitlistEntry.create({
      data: { familyId: targetFamilyId, date: d },
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Ya estás en lista de espera para esa fecha" }, { status: 409 });
    }
    console.error("Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    await prisma.waitlistEntry.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
