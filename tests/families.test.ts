import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { prisma } from "../src/lib/prisma";
import { POST as createFamily, GET as getFamily } from "../src/app/api/families/route";
import {
  POST as addFamilyMember,
  GET as getFamilyMembers,
} from "../src/app/api/families/[id]/members/route";

describe("Family and FamilyMember API endpoints", () => {
  beforeEach(() => {
    delete (globalThis as any).__mockSession;
  });

  describe("POST /api/families", () => {
    it("devuelve 401 si no hay sesión autenticada", async () => {
      (globalThis as any).__mockSession = null;

      const req = new Request("http://localhost:3000/api/families", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Familia González" }),
      });

      const res = await createFamily(req);
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.match(data.error, /no autorizado/i);
    });

    it("devuelve 403 si el rol no es SOCIO", async () => {
      (globalThis as any).__mockSession = {
        user: { id: "user-admin", role: "ADMIN", email: "admin@example.com" },
      };

      const req = new Request("http://localhost:3000/api/families", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Familia Admin" }),
      });

      const res = await createFamily(req);
      assert.strictEqual(res.status, 403);
    });

    it("devuelve 400 si los datos son inválidos (nombre vacío)", async () => {
      (globalThis as any).__mockSession = {
        user: { id: "user-socio", role: "SOCIO", email: "socio@example.com" },
      };

      const req = new Request("http://localhost:3000/api/families", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "" }),
      });

      const res = await createFamily(req);
      assert.strictEqual(res.status, 400);
    });

    it("devuelve 409 si el socio ya tiene una familia creada", async () => {
      (globalThis as any).__mockSession = {
        user: { id: "user-socio", role: "SOCIO", email: "socio@example.com" },
      };

      (prisma.family as any).findUnique = async ({ where }: any) => {
        if (where.ownerId === "user-socio") {
          return { id: "fam-existing", name: "Familia Existente", ownerId: "user-socio" };
        }
        return null;
      };

      const req = new Request("http://localhost:3000/api/families", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Familia Nueva" }),
      });

      const res = await createFamily(req);
      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.match(data.error, /ya tiene una familia registrada/i);
    });

    it("crea la familia para el socio autenticado y devuelve 201", async () => {
      (globalThis as any).__mockSession = {
        user: { id: "user-socio-1", role: "SOCIO", email: "socio@example.com" },
      };

      (prisma.family as any).findUnique = async () => null;

      let createdFamilyPayload: any = null;
      (prisma.family as any).create = async ({ data }: any) => {
        createdFamilyPayload = data;
        return {
          id: "fam-100",
          name: data.name,
          ownerId: data.ownerId,
          createdAt: new Date(),
        };
      };

      const req = new Request("http://localhost:3000/api/families", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Familia Pérez" }),
      });

      const res = await createFamily(req);
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.id, "fam-100");
      assert.strictEqual(data.name, "Familia Pérez");
      assert.strictEqual(createdFamilyPayload.ownerId, "user-socio-1");
      assert.strictEqual(createdFamilyPayload.name, "Familia Pérez");
    });
  });

  describe("POST /api/families/[id]/members", () => {
    it("devuelve 401 si no hay sesión autenticada", async () => {
      (globalThis as any).__mockSession = null;

      const req = new Request("http://localhost:3000/api/families/fam-1/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: "Ana Pérez", relation: "Cónyuge" }),
      });

      const res = await addFamilyMember(req, { params: Promise.resolve({ id: "fam-1" }) });
      assert.strictEqual(res.status, 401);
    });

    it("devuelve 404 si la familia no existe", async () => {
      (globalThis as any).__mockSession = {
        user: { id: "user-socio", role: "SOCIO", email: "socio@example.com" },
      };

      (prisma.family as any).findUnique = async () => null;

      const req = new Request("http://localhost:3000/api/families/fam-404/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: "Ana Pérez", relation: "Cónyuge" }),
      });

      const res = await addFamilyMember(req, { params: Promise.resolve({ id: "fam-404" }) });
      assert.strictEqual(res.status, 404);
    });

    it("devuelve 403 si el usuario no es dueño de la familia", async () => {
      (globalThis as any).__mockSession = {
        user: { id: "user-otro", role: "SOCIO", email: "otro@example.com" },
      };

      (prisma.family as any).findUnique = async () => ({
        id: "fam-1",
        ownerId: "user-socio",
        name: "Familia Pérez",
      });

      const req = new Request("http://localhost:3000/api/families/fam-1/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: "Ana Pérez", relation: "Cónyuge" }),
      });

      const res = await addFamilyMember(req, { params: Promise.resolve({ id: "fam-1" }) });
      assert.strictEqual(res.status, 403);
    });

    it("agrega un integrante sin cuenta de usuario (sin email) y devuelve 201", async () => {
      (globalThis as any).__mockSession = {
        user: { id: "user-socio", role: "SOCIO", email: "socio@example.com" },
      };

      (prisma.family as any).findUnique = async () => ({
        id: "fam-1",
        ownerId: "user-socio",
        name: "Familia Pérez",
      });

      let createdMemberPayload: any = null;
      (prisma.familyMember as any).create = async ({ data }: any) => {
        createdMemberPayload = data;
        return {
          id: "member-1",
          fullName: data.fullName,
          relation: data.relation,
          familyId: data.familyId,
          userId: null,
          user: null,
        };
      };

      const req = new Request("http://localhost:3000/api/families/fam-1/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Tomás Pérez",
          relation: "Hijo",
        }),
      });

      const res = await addFamilyMember(req, { params: Promise.resolve({ id: "fam-1" }) });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.id, "member-1");
      assert.strictEqual(data.fullName, "Tomás Pérez");
      assert.strictEqual(createdMemberPayload.fullName, "Tomás Pérez");
      assert.strictEqual(createdMemberPayload.relation, "Hijo");
      assert.strictEqual(createdMemberPayload.familyId, "fam-1");
      assert.strictEqual(createdMemberPayload.userId, undefined);
    });

    it("agrega un integrante con email creando nuevo User SOCIO y devuelve 201", async () => {
      (globalThis as any).__mockSession = {
        user: { id: "user-socio", role: "SOCIO", email: "socio@example.com" },
      };

      (prisma.family as any).findUnique = async () => ({
        id: "fam-1",
        ownerId: "user-socio",
        name: "Familia Pérez",
      });

      (prisma.user as any).findUnique = async () => null;

      let createdUserPayload: any = null;
      (prisma.user as any).create = async ({ data }: any) => {
        createdUserPayload = data;
        return {
          id: "user-conyuge",
          email: data.email,
          passwordHash: data.passwordHash,
          role: data.role,
        };
      };

      let createdMemberPayload: any = null;
      (prisma.familyMember as any).create = async ({ data }: any) => {
        createdMemberPayload = data;
        return {
          id: "member-2",
          fullName: data.fullName,
          relation: data.relation,
          familyId: data.familyId,
          userId: data.userId,
          user: {
            id: data.userId,
            email: "maria@example.com",
            role: "SOCIO",
          },
        };
      };

      const req = new Request("http://localhost:3000/api/families/fam-1/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "María Pérez",
          relation: "Cónyuge",
          email: "maria@example.com",
          password: "password123",
        }),
      });

      const res = await addFamilyMember(req, { params: Promise.resolve({ id: "fam-1" }) });
      assert.strictEqual(res.status, 201);

      assert.ok(createdUserPayload);
      assert.strictEqual(createdUserPayload.email, "maria@example.com");
      assert.strictEqual(createdUserPayload.role, "SOCIO");
      assert.notStrictEqual(createdUserPayload.passwordHash, "password123");

      assert.strictEqual(createdMemberPayload.fullName, "María Pérez");
      assert.strictEqual(createdMemberPayload.userId, "user-conyuge");

      const data = await res.json();
      assert.strictEqual(data.id, "member-2");
      assert.strictEqual(data.user?.email, "maria@example.com");
    });
  });

  describe("GET /api/families and GET /api/families/[id]/members", () => {
    it("GET /api/families retorna la familia del socio autenticado", async () => {
      (globalThis as any).__mockSession = {
        user: { id: "user-socio", role: "SOCIO", email: "socio@example.com" },
      };

      (prisma.family as any).findUnique = async ({ where }: any) => {
        if (where.ownerId === "user-socio") {
          return {
            id: "fam-1",
            name: "Familia Pérez",
            ownerId: "user-socio",
            members: [],
          };
        }
        return null;
      };

      const res = await getFamily();
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.id, "fam-1");
      assert.strictEqual(data.name, "Familia Pérez");
    });

    it("GET /api/families/[id]/members retorna los integrantes de la familia", async () => {
      (globalThis as any).__mockSession = {
        user: { id: "user-socio", role: "SOCIO", email: "socio@example.com" },
      };

      (prisma.family as any).findUnique = async () => ({
        id: "fam-1",
        ownerId: "user-socio",
        name: "Familia Pérez",
      });

      (prisma.familyMember as any).findMany = async () => [
        {
          id: "member-1",
          fullName: "Tomás Pérez",
          relation: "Hijo",
          familyId: "fam-1",
          user: null,
        },
      ];

      const req = new Request("http://localhost:3000/api/families/fam-1/members");
      const res = await getFamilyMembers(req, { params: Promise.resolve({ id: "fam-1" }) });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.length, 1);
      assert.strictEqual(data[0].fullName, "Tomás Pérez");
    });
  });
});
