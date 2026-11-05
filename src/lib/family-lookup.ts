import { prisma } from "./prisma";

const familyInclude = {
  members: {
    include: {
      user: { select: { id: true, email: true, role: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
};

export async function findFamilyForUser(userId: string) {
  const owned = await prisma.family.findFirst({
    where: { ownerId: userId },
    include: familyInclude,
  });
  if (owned) return owned;

  const member = await prisma.familyMember.findFirst({
    where: { userId },
    include: { family: { include: familyInclude } },
  });
  return member?.family ?? null;
}
