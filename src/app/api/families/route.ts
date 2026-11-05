import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findFamilyForUser } from "@/lib/family-lookup";

const createFamilySchema = z.object({
  name: z.string().trim().min(1, "El nombre de la familia es obligatorio"),
});

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    if (session.user.role !== "SOCIO" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Se requiere rol SOCIO o ADMIN" },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Cuerpo de solicitud JSON inválido" },
        { status: 400 }
      );
    }

    const parseResult = createFamilySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Datos de entrada inválidos",
          ...(process.env.NODE_ENV === "production"
            ? {}
            : { details: parseResult.error.flatten() }),
        },
        { status: 400 }
      );
    }

    const existingFamily = await prisma.family.findUnique({
      where: { ownerId: session.user.id },
    });

    if (existingFamily) {
      return NextResponse.json(
        { error: "El socio ya tiene una familia registrada" },
        { status: 409 }
      );
    }

    const count = await prisma.family.count();
    const code = `FAM-${String(count + 1).padStart(4, "0")}`;
    const family = await prisma.family.create({
      data: {
        name: parseResult.data.name,
        code,
        ownerId: session.user.id,
      },
    });

    return NextResponse.json(family, { status: 201 });
  } catch (error) {
    console.error("Error creating family:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const family = await findFamilyForUser(session.user.id);

    if (!family) {
      return NextResponse.json(
        { error: "Familia no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(family);
  } catch (error) {
    console.error("Error fetching family:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
