import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";

export function getAppUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";
  return url.replace(/\/$/, "");
}

export function getValidationUrl(token: string): string {
  const appUrl = getAppUrl();
  return `${appUrl}/validar/${token}`;
}

export async function generateQrDataUrl(token: string): Promise<string> {
  const url = getValidationUrl(token);
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
  });
}

export async function generateQrBuffer(token: string): Promise<Buffer> {
  const url = getValidationUrl(token);
  return QRCode.toBuffer(url, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
  });
}

export type QrValidationResult =
  | { status: "INVALID"; qrRecord: null; usedAt: null }
  | { status: "ALREADY_USED"; qrRecord: any; usedAt: Date }
  | { status: "VALID"; qrRecord: any; usedAt: Date };

export async function validateQrToken(
  token: string,
  checkedInBy?: string | null
): Promise<QrValidationResult> {
  if (!token || typeof token !== "string") {
    return { status: "INVALID", qrRecord: null, usedAt: null };
  }

  const qrRecord = await prisma.qrToken.findUnique({
    where: { token },
    include: {
      reservation: {
        include: {
          family: {
            include: {
              owner: true,
              members: true,
            },
          },
          addOns: {
            include: {
              addOnSpace: true,
            },
          },
          extraPersons: true,
        },
      },
    },
  });

  if (!qrRecord) {
    return { status: "INVALID", qrRecord: null, usedAt: null };
  }

  if (qrRecord.usedAt) {
    return {
      status: "ALREADY_USED",
      qrRecord,
      usedAt: qrRecord.usedAt,
    };
  }

  const now = new Date();
  const updated = await prisma.qrToken.update({
    where: { id: qrRecord.id },
    data: { usedAt: now },
    include: {
      reservation: {
        include: {
          family: {
            include: {
              owner: true,
              members: true,
            },
          },
          addOns: {
            include: {
              addOnSpace: true,
            },
          },
          extraPersons: true,
        },
      },
    },
  });

  // Registrar visita (quién validó)
  try {
    await prisma.visit.create({
      data: {
        reservationId: qrRecord.reservationId,
        checkedInBy: checkedInBy || "anonimo",
      },
    });
  } catch (e) {
    console.error("Error registrando visita:", e);
  }

  return {
    status: "VALID",
    qrRecord: updated,
    usedAt: now,
  };
}
