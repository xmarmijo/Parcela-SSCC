import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizeRut } from "@/lib/rut";

const registerSchema = z.object({
  email: z.string().email("Formato de email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  rut: z.string().min(1, "El RUT es obligatorio"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parseResult = registerSchema.safeParse(body);

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

    const { email, password, rut } = parseResult.data;
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRut = normalizeRut(rut);

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "El email ya está registrado" },
        { status: 409 }
      );
    }

    // Bloquear solo si ya existe una CUENTA con ese RUT
    const existingRutUser = await prisma.user.findUnique({
      where: { rut: normalizedRut },
    });
    if (existingRutUser) {
      return NextResponse.json(
        {
          error:
            "Este RUT ya tiene una cuenta registrada. Si no es así, contacta al administrador.",
        },
        { status: 409 }
      );
    }

    // Determinar si es socio (RUT en núcleo importado/manual)
    const matchingMember = await prisma.familyMember.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { rut: normalizedRut }],
      },
      include: { family: true },
    });
    const isSocio = !!matchingMember;

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        rut: normalizedRut,
        passwordHash,
        role: "SOCIO",
        isSocio,
        inscriptionPaid: isSocio, // socios no pagan inscripción
      },
    });

    // Vinculación automática por correo y luego por RUT
    if (matchingMember && !matchingMember.userId) {
      await prisma.familyMember.update({
        where: { id: matchingMember.id },
        data: { userId: user.id },
      });
      if (!matchingMember.family.ownerId) {
        await prisma.family.update({
          where: { id: matchingMember.family.id },
          data: { ownerId: user.id },
        });
      }
    }

    return NextResponse.json(
      {
        message: "Usuario registrado exitosamente",
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error en registro:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
