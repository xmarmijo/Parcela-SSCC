import { prisma } from "./prisma";

export async function logAudit(action: string, entityType: string, entityId?: string | null, userId?: string | null, details?: string) {
  try {
    await prisma.auditLog.create({
      data: { action, entityType, entityId: entityId ?? null, userId: userId ?? null, details: details ?? null },
    });
  } catch (e) {
    console.error("Audit log error:", e);
  }
}
