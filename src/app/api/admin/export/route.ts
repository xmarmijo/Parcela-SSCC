import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const workbook = new ExcelJS.Workbook();

    // Hoja Familias
    const famSheet = workbook.addWorksheet("Familias");
    famSheet.addRow(["ID", "Nombre", "Titular (email)", "Titular (RUT)", "Rol titular", "Creada"]);
    famSheet.getRow(1).font = { bold: true };
    const families = await prisma.family.findMany({
      include: { owner: { select: { email: true, rut: true, role: true } } },
      orderBy: { createdAt: "desc" },
    });
    for (const f of families) {
      famSheet.addRow([
        f.id,
        f.name,
        f.owner?.email ?? "",
        f.owner?.rut ?? "",
        f.owner?.role ?? "",
        f.createdAt.toISOString().slice(0, 10),
      ]);
    }

    // Hoja Integrantes
    const memSheet = workbook.addWorksheet("Integrantes");
    memSheet.addRow(["Familia", "Nombre", "Parentesco", "RUT", "Curso", "Exalumno", "Correo", "Tiene cuenta"]);
    memSheet.getRow(1).font = { bold: true };
    const members = await prisma.familyMember.findMany({
      include: { family: { select: { name: true } }, user: { select: { email: true } } },
      orderBy: { createdAt: "asc" },
    });
    for (const m of members) {
      memSheet.addRow([
        m.family?.name ?? "",
        m.fullName,
        m.relation,
        m.rut ?? "",
        m.course ?? "",
        m.exAlumno ? "Sí" : "No",
        m.email ?? m.user?.email ?? "",
        m.userId ? "Sí" : "No",
      ]);
    }

    // Hoja Reservas
    const resSheet = workbook.addWorksheet("Reservas");
    resSheet.addRow(["ID", "Familia", "Fecha", "Estado", "Total (CLP)", "Espacios", "Invitados extra", "Creada"]);
    resSheet.getRow(1).font = { bold: true };
    const reservations = await prisma.reservation.findMany({
      include: { family: true, addOns: { include: { addOnSpace: true } }, extraPersons: true },
      orderBy: { date: "desc" },
    });
    for (const r of reservations) {
      resSheet.addRow([
        r.id,
        r.family?.name ?? "",
        r.date.toISOString().slice(0, 10),
        r.status,
        r.totalAmount,
        r.addOns.map((a) => a.addOnSpace?.name ?? "").join(", "),
        r.extraPersons.map((p) => `${p.fullName}${p.rut ? ` (${p.rut})` : ""}${p.usesPool ? " [piscina]" : ""}`).join("; "),
        r.createdAt.toISOString().slice(0, 10),
      ]);
    }

    // Hoja Multas
    const fineSheet = workbook.addWorksheet("Multas");
    fineSheet.addRow(["ID", "Familia", "Integrante", "Motivo", "Monto (CLP)", "Emitida por", "Fecha"]);
    fineSheet.getRow(1).font = { bold: true };
    const fines = await prisma.fine.findMany({
      include: { family: { select: { name: true } }, familyMember: { select: { fullName: true } }, issuedBy: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
    });
    for (const f of fines) {
      fineSheet.addRow([
        f.id,
        f.family?.name ?? "",
        f.familyMember?.fullName ?? "",
        f.reason,
        f.amount,
        f.issuedBy?.email ?? "",
        f.createdAt.toISOString().slice(0, 10),
      ]);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="parcela-sscc-export.xlsx"',
      },
    });
  } catch (error) {
    console.error("Error exportando:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
