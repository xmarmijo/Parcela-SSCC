import "dotenv/config";
import { defineConfig } from "prisma/config";

// En Vercel, `prisma generate` se ejecuta durante `npm install`, un paso donde
// las variables de entorno del proyecto todavía no están disponibles. Por eso
// no usamos el helper `env()` (que lanza error si falta la variable): el
// generate no necesita una URL real, y los comandos que sí la necesitan
// (migrate/seed) la reciben desde process.env en tiempo de ejecución.
const databaseUrl = process.env.DATABASE_URL ?? "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
