import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import ExcelJS from "exceljs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Nucleos");

  const headers = [
    "id_nucleo",
    "rut_titular",
    "nombre_titular",
    "apellido_paterno",
    "apellido_materno",
    "correo_titular",
    "rut_integrante",
    "nombre_integrante",
    "parentesco",
    "curso",
    "exalumno",
  ];
  sheet.addRow(headers);
  sheet.getRow(1).font = { bold: true };

  // Fila de ejemplo: familia Moncada
  const ejemplo = [
    ["NUC-001", "21523698-9", "Pedro", "Moncada", "Armijo", "pedro@example.com", "21523698-9", "Pedro Moncada Armijo", "titular", "", "NO"],
    ["NUC-001", "21523698-9", "Pedro", "Moncada", "Armijo", "pedro@example.com", "26895475-9", "Elimig Lopez Lopez", "cónyuge", "", "NO"],
    ["NUC-001", "21523698-9", "Pedro", "Moncada", "Armijo", "pedro@example.com", "28569241-2", "Enzo Moncada Lopez", "hijo/a", "3° Medio", "NO"],
    ["NUC-001", "21523698-9", "Pedro", "Moncada", "Armijo", "pedro@example.com", "24258965-3", "Emily Moncada Lopez", "hijo/a", "1° Medio", "NO"],
  ];
  ejemplo.forEach((row) => sheet.addRow(row));

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-nucleos.xlsx"',
    },
  });
}
