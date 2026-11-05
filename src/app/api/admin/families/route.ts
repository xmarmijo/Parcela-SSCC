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
    const q = searchParams.get("q")?.trim() ?? "";
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = 20;

    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { owner: { email: { contains: q, mode: "insensitive" as const } } },
            { owner: { rut: { contains: q, mode: "insensitive" as const } } },
            { members: { some: { fullName: { contains: q, mode: "insensitive" as const } } } },
          ],
        }
      : {};

    const [total, families] = await Promise.all([
      prisma.family.count({ where }),
      prisma.family.findMany({
        where,
        include: {
          owner: { select: { id: true, email: true, role: true, rut: true } },
          members: { select: { id: true, fullName: true, relation: true, rut: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({ total, page, pageSize, families });
  } catch (error) {
    console.error("Error listing families:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
