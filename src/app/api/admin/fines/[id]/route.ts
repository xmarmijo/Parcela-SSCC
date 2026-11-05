import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const { id } = await Promise.resolve(context.params);
    const body = await req.json();
    const data: any = {};
    if (body.paid === true) data.paidAt = new Date();
    if (body.paid === false) data.paidAt = null;
    const fine = await prisma.fine.update({ where: { id }, data });
    return NextResponse.json(fine);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
