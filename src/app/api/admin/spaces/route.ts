import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  pricePerUnit: z.number().int().nonnegative().optional(),
  capacityGuests: z.number().int().positive().nullable().optional(),
});

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const spaces = await prisma.addOnSpace.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(spaces);
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
    const { id, ...rest } = body;
    const parsed = updateSchema.safeParse(rest);
    if (!parsed.success || !id) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    const space = await prisma.addOnSpace.update({ where: { id }, data: parsed.data });
    return NextResponse.json(space);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
