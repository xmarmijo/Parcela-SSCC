import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const spaces = await prisma.addOnSpace.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(spaces);
  } catch (error) {
    console.error("Error fetching add-on spaces:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
