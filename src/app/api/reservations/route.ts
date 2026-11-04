import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateTotal } from "@/lib/pricing";

const extraPersonSchema = z.object({
  fullName: z.string().trim().min(1, "El nombre del invitado es obligatorio"),
  usesPool: z.boolean().optional().default(false),
});

const addOnSchema = z.object({
  addOnSpaceId: z.string().trim().min(1, "El ID del espacio es obligatorio"),
  quantity: z
    .number()
    .int()
    .positive("La cantidad debe ser mayor a 0")
    .optional()
    .default(1),
});

const createReservationSchema = z.object({
  familyId: z.string().trim().optional(),
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener el formato YYYY-MM-DD"),
  extraPersons: z.array(extraPersonSchema).optional().default([]),
  addOns: z.array(addOnSchema).optional().default([]),
});

function parseBookingDate(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);

  const d = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  if (isNaN(d.getTime())) return null;

  // Final verification to ensure date wasn't rolled over (e.g. Feb 30 -> March 2)
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month || d.getUTCDate() !== day) {
    return null;
  }

  return d;
}

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

    const parseResult = createReservationSchema.safeParse(body);
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

    const { familyId, date: rawDate, extraPersons, addOns } = parseResult.data;

    // Validate date
    const bookingDate = parseBookingDate(rawDate);
    if (!bookingDate) {
      return NextResponse.json(
        { error: "Formato de fecha inválido" },
        { status: 400 }
      );
    }

    const now = new Date();
    const startOfTodayUtc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
    );

    if (bookingDate < startOfTodayUtc) {
      return NextResponse.json(
        { error: "La fecha de reserva debe ser futura" },
        { status: 400 }
      );
    }

    // Determine target family
    let targetFamilyId = familyId;

    if (targetFamilyId) {
      const family = await prisma.family.findUnique({
        where: { id: targetFamilyId },
      });

      if (!family) {
        return NextResponse.json(
          { error: "Familia no encontrada" },
          { status: 404 }
        );
      }

      if (family.ownerId !== session.user.id && session.user.role !== "ADMIN") {
        const member = await prisma.familyMember.findFirst({
          where: {
            familyId: targetFamilyId,
            userId: session.user.id,
          },
        });

        if (!member) {
          return NextResponse.json(
            { error: "No tienes permiso para reservar para esta familia" },
            { status: 403 }
          );
        }
      }
    } else {
      const ownedFamily = await prisma.family.findUnique({
        where: { ownerId: session.user.id },
      });

      if (ownedFamily) {
        targetFamilyId = ownedFamily.id;
      } else {
        const memberRecord = await prisma.familyMember.findFirst({
          where: { userId: session.user.id },
        });

        if (memberRecord) {
          targetFamilyId = memberRecord.familyId;
        } else {
          return NextResponse.json(
            { error: "El usuario no tiene una familia registrada" },
            { status: 400 }
          );
        }
      }
    }

    // Check for existing active reservation for family+date (409)
    const existingReservation = await prisma.reservation.findFirst({
      where: {
        familyId: targetFamilyId,
        date: bookingDate,
        status: {
          not: "CANCELADA",
        },
      },
    });

    if (existingReservation) {
      return NextResponse.json(
        {
          error:
            "Ya existe una reserva para esta familia en la fecha seleccionada",
        },
        { status: 409 }
      );
    }

    // Fetch add-on spaces to calculate prices server-side
    const availableSpaces = await prisma.addOnSpace.findMany();

    // Verify all requested addOns exist
    for (const addOn of addOns) {
      const exists = availableSpaces.some(
        (s) => s.id === addOn.addOnSpaceId || s.name === addOn.addOnSpaceId
      );
      if (!exists) {
        return NextResponse.json(
          { error: `Espacio arrendable no encontrado: ${addOn.addOnSpaceId}` },
          { status: 400 }
        );
      }
    }

    // Calculate total purely on server
    const totalAmount = calculateTotal(
      {
        extraPersons,
        addOns,
      },
      {
        addOnSpaces: availableSpaces,
      }
    );

    // Create Reservation + ExtraPerson + ReservationAddOn in transaction
    const createData = async (tx: any) => {
      return tx.reservation.create({
        data: {
          familyId: targetFamilyId!,
          date: bookingDate,
          status: "PENDIENTE_PAGO",
          totalAmount,
          extraPersons:
            extraPersons.length > 0
              ? {
                  create: extraPersons.map((p) => ({
                    fullName: p.fullName,
                    usesPool: Boolean(p.usesPool),
                  })),
                }
              : undefined,
          addOns:
            addOns.length > 0
              ? {
                  create: addOns.map((a) => {
                    // Match id if addOnSpaceId was given by id or name
                    const matched = availableSpaces.find(
                      (s) =>
                        s.id === a.addOnSpaceId || s.name === a.addOnSpaceId
                    );
                    return {
                      addOnSpaceId: matched ? matched.id : a.addOnSpaceId,
                      quantity: a.quantity ?? 1,
                    };
                  }),
                }
              : undefined,
        },
        include: {
          family: true,
          extraPersons: true,
          addOns: {
            include: {
              addOnSpace: true,
            },
          },
        },
      });
    };

    let reservation;
    try {
      reservation = await prisma.$transaction(
        async (tx) => createData(tx)
      );
    } catch (err: any) {
      if (err?.code === "P2002") {
        return NextResponse.json(
          {
            error:
              "Ya existe una reserva para esta familia en la fecha seleccionada",
          },
          { status: 409 }
        );
      }
      throw err;
    }

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    console.error("Error creating reservation:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const queryFamilyId = searchParams.get("familyId");

    let targetFamilyId: string | undefined;

    if (session.user.role === "ADMIN") {
      targetFamilyId = queryFamilyId ?? undefined;
    } else {
      const ownedFamily = await prisma.family.findUnique({
        where: { ownerId: session.user.id },
      });

      if (ownedFamily) {
        targetFamilyId = ownedFamily.id;
      } else {
        const memberRecord = await prisma.familyMember.findFirst({
          where: { userId: session.user.id },
        });
        if (memberRecord) {
          targetFamilyId = memberRecord.familyId;
        } else {
          return NextResponse.json([]);
        }
      }
    }

    const reservations = await prisma.reservation.findMany({
      where: targetFamilyId ? { familyId: targetFamilyId } : {},
      include: {
        family: true,
        extraPersons: true,
        addOns: {
          include: {
            addOnSpace: true,
          },
        },
      },
      orderBy: { date: "asc" },
    });

    return NextResponse.json(reservations);
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
