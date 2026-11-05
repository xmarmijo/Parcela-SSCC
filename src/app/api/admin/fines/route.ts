import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const createFineSchema = z.object({
  familyId: z.string().min(1),
  familyMemberId: z.string().optional().nullable(),
  reason: z.string().trim().min(1, "El motivo es obligatorio"),
  amount: z.number().int().positive("El monto debe ser mayor a 0"),
});

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const familyId = searchParams.get("familyId");
    const fines = await prisma.fine.findMany({
      where: familyId ? { familyId } : {},
      include: {
        family: { select: { id: true, name: true } },
        familyMember: { select: { id: true, fullName: true } },
        issuedBy: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(fines);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const body = await req.json();
    const parsed = createFineSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }
    const { familyId, familyMemberId, reason, amount } = parsed.data;
    const fine = await prisma.fine.create({
      data: {
        familyId,
        familyMemberId: familyMemberId || null,
        reason,
        amount,
        issuedById: session.user.id,
      },
    });
    // Enviar correo de notificación (no bloquea la respuesta)
    try {
      const { sendFineEmail } = await import("@/lib/notify");
      sendFineEmail(fine.id).catch((e) => console.error("Error enviando correo de multa:", e));
    } catch (e) {
      console.error("Error importando notify:", e);
    }
    logAudit("fine.create", "fine", fine.id, session.user.id, `${reason} - $${amount}`);
    return NextResponse.json(fine, { status: 201 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
