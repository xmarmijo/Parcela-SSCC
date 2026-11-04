import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateQrBuffer,
  generateQrDataUrl,
  getValidationUrl,
} from "@/lib/qr";

type RouteContext = {
  params: Promise<{ token: string }> | { token: string };
};

export async function GET(req: Request, context: RouteContext) {
  try {
    const { token } = await Promise.resolve(context.params);

    if (!token) {
      return NextResponse.json(
        { error: "Token QR requerido" },
        { status: 400 }
      );
    }

    const qrRecord = await prisma.qrToken.findUnique({
      where: { token },
      include: {
        reservation: true,
      },
    });

    if (!qrRecord) {
      return NextResponse.json(
        { error: "Código QR no encontrado" },
        { status: 404 }
      );
    }

    const url = new URL(req.url);
    const wantsJson =
      url.searchParams.get("format") === "json" ||
      req.headers.get("accept")?.includes("application/json");

    if (wantsJson) {
      const dataUrl = await generateQrDataUrl(token);
      return NextResponse.json({
        token: qrRecord.token,
        reservationId: qrRecord.reservationId,
        usedAt: qrRecord.usedAt,
        valid: !qrRecord.usedAt,
        dataUrl,
        validationUrl: getValidationUrl(token),
      });
    }

    const buffer = await generateQrBuffer(token);

    return new Response(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error generating QR:", error);
    return NextResponse.json(
      { error: "Error al generar código QR" },
      { status: 500 }
    );
  }
}
