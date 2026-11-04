import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { prisma } from "../src/lib/prisma";
import { POST } from "../src/app/api/auth/register/route";

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    // Reset any mocks
  });

  it("crea un nuevo User con rol SOCIO y devuelve 201", async () => {
    // Mock prisma.user.findUnique to return null (no existing user)
    (prisma.user as any).findUnique = async () => null;

    // Mock prisma.user.create to return created user
    let createdData: any = null;
    (prisma.user as any).create = async ({ data }: any) => {
      createdData = data;
      return {
        id: "user-123",
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
        createdAt: new Date(),
      };
    };

    const req = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "socio@example.com",
        password: "password123",
      }),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 201);

    const body = await res.json();
    assert.strictEqual(body.user.email, "socio@example.com");
    assert.strictEqual(body.user.role, "SOCIO");
    assert.strictEqual(body.user.id, "user-123");
    assert.strictEqual(createdData.role, "SOCIO");
    // Verify password was hashed (not plain text)
    assert.notStrictEqual(createdData.passwordHash, "password123");
  });

  it("devuelve 409 si el email ya existe", async () => {
    // Mock prisma.user.findUnique to return an existing user
    (prisma.user as any).findUnique = async () => ({
      id: "existing-user",
      email: "socio@example.com",
      passwordHash: "hash",
      role: "SOCIO",
    });

    const req = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "socio@example.com",
        password: "password123",
      }),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 409);

    const body = await res.json();
    assert.ok(body.error);
    assert.match(body.error, /ya está registrado/i);
  });

  it("devuelve 400 si los datos son inválidos", async () => {
    const req = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "not-an-email",
        password: "123", // too short
      }),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 400);

    const body = await res.json();
    assert.ok(body.error);
  });
});
