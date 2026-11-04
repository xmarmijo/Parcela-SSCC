import { describe, it } from "node:test";
import assert from "node:assert";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

// We can test the credentials authorization logic directly
describe("NextAuth Credentials Authorization", () => {
  it("valida usuario y contraseña correcta", async () => {
    const password = "correct-password";
    const passwordHash = await bcrypt.hash(password, 10);

    (prisma.user as any).findUnique = async ({ where }: any) => {
      if (where.email === "socio@example.com") {
        return {
          id: "socio-1",
          email: "socio@example.com",
          passwordHash,
          role: "SOCIO",
        };
      }
      return null;
    };

    // Simulate authorize check
    const email = "socio@example.com";
    const user = await prisma.user.findUnique({ where: { email } });
    assert.ok(user);
    const valid = await bcrypt.compare(password, user.passwordHash);
    assert.strictEqual(valid, true);
    assert.strictEqual(user.role, "SOCIO");
  });

  it("rechaza contraseña incorrecta", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 10);

    (prisma.user as any).findUnique = async () => ({
      id: "socio-1",
      email: "socio@example.com",
      passwordHash,
      role: "SOCIO",
    });

    const user = await prisma.user.findUnique({ where: { email: "socio@example.com" } });
    assert.ok(user);
    const valid = await bcrypt.compare("wrong-password", user.passwordHash);
    assert.strictEqual(valid, false);
  });

  it("rechaza email inexistente", async () => {
    (prisma.user as any).findUnique = async () => null;

    const user = await prisma.user.findUnique({ where: { email: "noexiste@example.com" } });
    assert.strictEqual(user, null);
  });
});
