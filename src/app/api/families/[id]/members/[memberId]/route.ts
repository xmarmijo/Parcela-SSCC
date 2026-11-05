import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeRut } from "@/lib/rut";

const updateMemberSchema = z.object({
  fullName: z.string().trim().min(1).optional(),
  relation: z.string().trim().min(1).optional(),
  rut: z.string().trim().optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal("")),
  course: z.string().trim().optional().nullable(),
  exAlumno: z.boolean().optional(),
});

type RouteContext = {
  params: Promise<{ id: string; memberId: string }> | { id: string; memberId: string };
};

async function getParams(context: RouteContext) {
  return await Promise.resolve(context.params);
}

async function canManage(familyId: string, userId: string, role: string) {
  const family = await prisma.family.findUnique({ where: { id: familyId } });
  if (!family) return { ok: false, status: 404, error: "Familia no encontrada" };
  if (family.ownerId !== userId && role !== "ADMIN") {
    return { ok: false, status: 403, error: "No tienes permiso para modificar esta familia" };
  }
  return { ok: true, family };
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { id: familyId, memberId } = await getParams(context);
    const check = await canManage(familyId, session.user.id, session.user.role);
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Cuerpo de solicitud JSON inválido" }, { status: 400 });
    }
    const parse = updateMemberSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: "Datos de entrada inválidos" }, { status: 400 });
    }
    const data = parse.data;
    const updateData: any = {};
    if (data.fullName !== undefined) updateData.fullName = data.fullName;
    if (data.relation !== undefined) updateData.relation = data.relation;
    if (data.rut !== undefined) updateData.rut = data.rut ? normalizeRut(data.rut) : null;
    if (data.email !== undefined) updateData.email = data.email ? data.email.trim().toLowerCase() : null;
    if (data.course !== undefined) updateData.course = data.course ? data.course.trim() : null;
    if (data.exAlumno !== undefined) updateData.exAlumno = data.exAlumno;

    const member = await prisma.familyMember.update({
      where: { id: memberId },
      data: updateData,
      include: { user: { select: { id: true, email: true, role: true } } },
    });
    return NextResponse.json(member);
  } catch (error) {
    console.error("Error updating family member:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { id: familyId, memberId } = await getParams(context);
    const check = await canManage(familyId, session.user.id, session.user.role);
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }
    await prisma.familyMember.delete({ where: { id: memberId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting family member:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
