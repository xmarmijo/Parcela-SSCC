import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeRut } from "@/lib/rut";
import ExcelJS from "exceljs";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return NextResponse.json({ error: "Hoja no encontrada" }, { status: 400 });
    }

    // Parse rows
    const rows: any[] = [];
    const headerRow = sheet.getRow(1);
    const headers = headerRow.values as any[];
    // headers[0] is empty (1-based)
    const colIndex: Record<string, number> = {};
    headers.forEach((h, i) => {
      if (typeof h === "string") colIndex[h.trim()] = i;
    });

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const get = (key: string) => {
        const idx = colIndex[key];
        if (!idx) return "";
        const v = row.getCell(idx).value;
        return v == null ? "" : String(v).trim();
      };
      const idNucleo = get("id_nucleo");
      if (!idNucleo) return;
      rows.push({
        idNucleo,
        rutTitular: normalizeRut(get("rut_titular")),
        nombreTitular: get("nombre_titular"),
        apellidoPaterno: get("apellido_paterno"),
        apellidoMaterno: get("apellido_materno"),
        correoTitular: get("correo_titular").toLowerCase(),
        rutIntegrante: normalizeRut(get("rut_integrante")),
        nombreIntegrante: get("nombre_integrante"),
        parentesco: get("parentesco") || "integrante",
        curso: get("curso"),
        exAlumno: get("exalumno").toUpperCase() === "SI",
      });
    });

    // Group by id_nucleo
    const groups = new Map<string, any[]>();
    for (const r of rows) {
      if (!groups.has(r.idNucleo)) groups.set(r.idNucleo, []);
      groups.get(r.idNucleo)!.push(r);
    }

    let created = 0;
    let updated = 0;
    let membersCount = 0;
    const errors: string[] = [];

    for (const [idNucleo, groupRows] of groups) {
      try {
        const first = groupRows[0];
        const familyName = `Familia ${first.apellidoPaterno}`.trim();

        let family = await prisma.family.findUnique({ where: { importKey: idNucleo } });
        if (!family) {
          const count = await prisma.family.count();
          const code = `FAM-${String(count + 1).padStart(4, "0")}`;
          family = await prisma.family.create({
            data: {
              name: familyName,
              code,
              importKey: idNucleo,
              importedAt: new Date(),
            },
          });
          created++;
        } else {
          updated++;
        }

        for (const r of groupRows) {
          if (!r.rutIntegrante) continue;
          const fullName = r.nombreIntegrante || `${r.nombreTitular} ${r.apellidoPaterno}`.trim();
          const existing = await prisma.familyMember.findFirst({
            where: { familyId: family.id, rut: r.rutIntegrante },
          });
          if (existing) {
            await prisma.familyMember.update({
              where: { id: existing.id },
              data: {
                fullName,
                relation: r.parentesco,
                rut: r.rutIntegrante,
                email: r.correoTitular || (r.rutIntegrante === r.rutTitular ? r.correoTitular : existing.email),
                course: r.curso || null,
                exAlumno: r.exAlumno,
              },
            });
          } else {
            await prisma.familyMember.create({
              data: {
                familyId: family.id,
                fullName,
                relation: r.parentesco,
                rut: r.rutIntegrante,
                email: r.correoTitular && r.rutIntegrante === r.rutTitular ? r.correoTitular : null,
                course: r.curso || null,
                exAlumno: r.exAlumno,
              },
            });
          }
          membersCount++;
        }
      } catch (e: any) {
        errors.push(`Núcleo ${idNucleo}: ${e?.message ?? "error"}`);
      }
    }

    return NextResponse.json({ created, updated, members: membersCount, errors });
  } catch (error) {
    console.error("Error importing families:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
