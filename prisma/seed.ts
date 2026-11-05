/**
 * prisma/seed.ts
 * Seeds the AddOnSpace table with the rentable spaces and their prices.
 *
 * Run with: npx prisma db seed
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const spaces = [
    {
      name: "quincho_grande",
      pricePerUnit: 20000,
      capacityGuests: null,
    },
    {
      name: "quincho_chico",
      pricePerUnit: 10000,
      capacityGuests: null,
    },
    {
      name: "casino",
      pricePerUnit: 60000,
      capacityGuests: 80,
    },
    {
      name: "sala_cafeteria",
      pricePerUnit: 40000,
      capacityGuests: 30,
    },
  ];

  for (const space of spaces) {
    const result = await prisma.addOnSpace.upsert({
      where: { name: space.name },
      update: {},
      create: space,
    });
    console.log(`✅ AddOnSpace upserted: ${result.name} (id: ${result.id})`);
  }

  console.log("\n🌱 Seed complete — 3 add-on spaces ready.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
