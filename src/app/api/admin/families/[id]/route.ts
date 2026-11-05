import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  ownerRole: z.enum(["SOCIO", "ADMIN"]).optional(),
});

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

export async function GET(_req: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const { id } = await Promise.resolve(context.params);
    const family = await prisma.family.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, email: true, role: true, rut: true } },
        members: { include: { user: { select: { id: true, email: true, role: true } } } },
        reservations: { orderBy: { date: "desc" }, take: 20, include: { addOns: { include: { addOnSpace: true } } } },
        fines: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!family) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    return NextResponse.json(family);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const { id } = await Promise.resolve(context.params);
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    const data: any = {};
    if (parsed.data.name) data.name = parsed.data.name;
    const family = await prisma.family.update({ where: { id }, data });
    if (parsed.data.ownerRole && family.ownerId) {
      await prisma.user.update({ where: { id: family.ownerId }, data: { role: parsed.data.ownerRole } });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
