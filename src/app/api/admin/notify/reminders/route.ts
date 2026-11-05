import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendReminderEmails } from "@/lib/notify";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const result = await sendReminderEmails();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
