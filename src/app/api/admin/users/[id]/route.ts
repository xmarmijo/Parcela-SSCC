import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional(),
  role: z.enum(["SOCIO", "ADMIN", "GUARDIA"]).optional(),
  inscriptionPaid: z.boolean().optional(),
  isSocio: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const { id } = await Promise.resolve(context.params);
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    const data: any = {};
    if (parsed.data.role) data.role = parsed.data.role;
    if (parsed.data.password) {
      data.passwordHash = await bcrypt.hash(parsed.data.password, 10);
    }
    if (parsed.data.inscriptionPaid !== undefined) data.inscriptionPaid = parsed.data.inscriptionPaid;
    if (parsed.data.isSocio !== undefined) data.isSocio = parsed.data.isSocio;
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
    }
    const user = await prisma.user.update({ where: { id }, data, select: { id: true, email: true, role: true } });
    return NextResponse.json(user);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const { id } = await Promise.resolve(context.params);
    if (id === session.user.id) {
      return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 400 });
    }
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
