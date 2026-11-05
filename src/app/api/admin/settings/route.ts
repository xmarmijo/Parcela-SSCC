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
      where: { key: { in: ["gmail_user", "gmail_app_password", "email_from"] } },
    });
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;
    return NextResponse.json({
      gmailUser: map.gmail_user ?? process.env.GMAIL_USER ?? "",
      hasPassword: !!(map.gmail_app_password || process.env.GMAIL_APP_PASSWORD),
      emailFrom: map.email_from ?? process.env.EMAIL_FROM ?? "",
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
