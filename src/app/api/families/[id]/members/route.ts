import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeRut } from "@/lib/rut";

const addMemberSchema = z.object({
  fullName: z.string().trim().min(1, "El nombre completo es obligatorio"),
  relation: z.string().trim().min(1, "El parentesco o relación es obligatorio"),
  rut: z.string().trim().min(1, "El RUT es obligatorio"),
  email: z
    .string()
    .trim()
    .email("Formato de email inválido")
    .optional()
    .nullable()
    .or(z.literal("")),
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .optional()
    .nullable()
    .or(z.literal("")),
});

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function POST(req: Request, context: RouteContext) {
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

    const { id: familyId } = await Promise.resolve(context.params);

    if (!familyId) {
      return NextResponse.json(
        { error: "ID de familia requerido" },
        { status: 400 }
      );
    }

    const family = await prisma.family.findUnique({
      where: { id: familyId },
    });

    if (!family) {
      return NextResponse.json(
        { error: "Familia no encontrada" },
        { status: 404 }
      );
    }

    if (family.ownerId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "No tienes permiso para modificar esta familia" },
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

    const parseResult = addMemberSchema.safeParse(body);
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

    const { fullName, relation, email, password, rut } = parseResult.data;
    const normalizedRut = normalizeRut(rut);

    // Evitar duplicados dentro de la misma familia
    const existingMember = await prisma.familyMember.findFirst({
      where: { familyId, rut: normalizedRut },
    });
    if (existingMember) {
      return NextResponse.json(
        { error: "Este integrante ya está registrado en tu núcleo" },
        { status: 409 }
      );
    }

    let userId: string | undefined = undefined;

    if (email && email.trim() !== "") {
      const normalizedEmail = email.trim().toLowerCase();

      let user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user) {
        const passwordToUse =
          password && password.trim() !== ""
            ? password
            : "Parcela2026!";
        const passwordHash = await bcrypt.hash(passwordToUse, 10);

        user = await prisma.user.create({
          data: {
            email: normalizedEmail,
            passwordHash,
            role: "SOCIO",
          },
        });
      }

      userId = user.id;
    }

    const member = await prisma.familyMember.create({
      data: {
        fullName,
        relation,
        rut: normalizedRut,
        familyId,
        ...(userId ? { userId } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error("Error adding family member:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const { id: familyId } = await Promise.resolve(context.params);

    const family = await prisma.family.findUnique({
      where: { id: familyId },
    });

    if (!family) {
      return NextResponse.json(
        { error: "Familia no encontrada" },
        { status: 404 }
      );
    }

    if (family.ownerId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "No tienes permiso para ver los miembros de esta familia" },
        { status: 403 }
      );
    }

    const members = await prisma.familyMember.findMany({
      where: { familyId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("Error fetching family members:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
