import { NextResponse } from "next/server";
import { sendReminderEmails } from "@/lib/notify";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret") || req.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const result = await sendReminderEmails();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error cron reminders:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
