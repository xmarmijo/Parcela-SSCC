import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

function normalizeRut(input) {
  if (!input) return input;
  let cleaned = String(input).replace(/\./g, "").replace(/\s/g, "").toUpperCase();
  if (cleaned.includes("-")) {
    const [body, dv] = cleaned.split("-");
    cleaned = body + (dv ?? "");
  }
  if (cleaned.length < 2) return cleaned;
  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);
  return `${body}-${dv}`;
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const users = await prisma.user.findMany({ select: { id: true, rut: true } });
  for (const u of users) {
    const n = normalizeRut(u.rut);
    if (n !== u.rut) await prisma.user.update({ where: { id: u.id }, data: { rut: n } });
  }
  const members = await prisma.familyMember.findMany({ select: { id: true, rut: true } });
  for (const m of members) {
    const n = normalizeRut(m.rut);
    if (n !== m.rut) await prisma.familyMember.update({ where: { id: m.id }, data: { rut: n } });
  }
  const guests = await prisma.extraPerson.findMany({ select: { id: true, rut: true } });
  for (const g of guests) {
    const n = normalizeRut(g.rut);
    if (n !== g.rut) await prisma.extraPerson.update({ where: { id: g.id }, data: { rut: n } });
  }
  console.log("done");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });