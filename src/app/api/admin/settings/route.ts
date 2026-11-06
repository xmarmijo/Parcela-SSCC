import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const settings = await prisma.appSetting.findMany({
      where: { key: { in: ["gmail_user", "gmail_app_password", "email_from", "bank_name", "bank_account_type", "bank_account_number", "bank_rut", "bank_email", "fine_reasons", "blocked_weekdays"] } },
    });
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;
    return NextResponse.json({
      gmailUser: map.gmail_user ?? process.env.GMAIL_USER ?? "",
      hasPassword: !!(map.gmail_app_password || process.env.GMAIL_APP_PASSWORD),
      emailFrom: map.email_from ?? process.env.EMAIL_FROM ?? "",
      bankName: map.bank_name ?? "",
      bankAccountType: map.bank_account_type ?? "",
      bankAccountNumber: map.bank_account_number ?? "",
      bankRut: map.bank_rut ?? "",
      bankEmail: map.bank_email ?? "",
      fineReasons: map.fine_reasons ? JSON.parse(map.fine_reasons) : [],
      blockedWeekdays: map.blocked_weekdays ? map.blocked_weekdays.split(",").map((x) => Number(x)).filter((n) => !isNaN(n)) : [],
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const body = await req.json();
    const upserts: { key: string; value: string }[] = [];
    if (typeof body.gmailUser === "string") upserts.push({ key: "gmail_user", value: body.gmailUser.trim() });
    if (typeof body.gmailAppPassword === "string" && body.gmailAppPassword.trim() !== "") {
      upserts.push({ key: "gmail_app_password", value: body.gmailAppPassword.trim() });
    }
    if (typeof body.emailFrom === "string") upserts.push({ key: "email_from", value: body.emailFrom.trim() });
    if (typeof body.bankName === "string") upserts.push({ key: "bank_name", value: body.bankName.trim() });
    if (typeof body.bankAccountType === "string") upserts.push({ key: "bank_account_type", value: body.bankAccountType.trim() });
    if (typeof body.bankAccountNumber === "string") upserts.push({ key: "bank_account_number", value: body.bankAccountNumber.trim() });
    if (typeof body.bankRut === "string") upserts.push({ key: "bank_rut", value: body.bankRut.trim() });
    if (typeof body.bankEmail === "string") upserts.push({ key: "bank_email", value: body.bankEmail.trim() });
    if (Array.isArray(body.fineReasons)) upserts.push({ key: "fine_reasons", value: JSON.stringify(body.fineReasons) });
    if (Array.isArray(body.blockedWeekdays)) upserts.push({ key: "blocked_weekdays", value: body.blockedWeekdays.join(",") });

    for (const u of upserts) {
      await prisma.appSetting.upsert({
        where: { key: u.key },
        update: { value: u.value },
        create: { key: u.key, value: u.value },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
