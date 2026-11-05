import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { prisma } from "../src/lib/prisma";
import {
  POST as createReservation,
  GET as getReservations,
} from "../src/app/api/reservations/route";
import {
  GET as getReservationById,
} from "../src/app/api/reservations/[id]/route";
import { GET as getAddOnSpaces } from "../src/app/api/addon-spaces/route";

describe("Reservations and AddOnSpace API endpoints", () => {
  beforeEach(() => {
    (prisma.blockedDate as any).findUnique = async () => null;
    (prisma.fine as any).count = async () => 0;
  });
  beforeEach(() => {
    delete (globalThis as any).__mockSession;
    // Default mock transaction to execute callback with prisma
    (prisma as any).$transaction = async (fn: any) => {
      if (typeof fn === "function") {
        return fn(prisma);
      }
      return Promise.all(fn);
    };
  });

  describe("GET /api/addon-spaces", () => {
    it("devuelve 401 si no hay sesión autenticada", async () => {
      (globalThis as any).__mockSession = null;

      const res = await getAddOnSpaces();
      assert.strictEqual(res.status, 401);
    });

    it("retorna lista de espacios disponibles", async () => {
      (globalThis as any).__mockSession = {
        user: { id: "user-socio", role: "SOCIO", email: "socio@example.com" },
      };

      const mockSpaces = [
        { id: "space-quincho", name: "quincho", pricePerUnit: 20000, capacityGuests: null },
        { id: "space-sala", name: "sala_eventos", pricePerUnit: 50000, capacityGuests: 80 },
      ];

      (prisma.addOnSpace as any).findMany = async () => mockSpaces;
      (prisma.family as any).findUnique = async () => null;
      (prisma.familyMember as any).findFirst = async () => null;

      const res = await getAddOnSpaces();
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.length, 2);
      assert.strictEqual(data[0].name, "quincho");
    });
  });

  describe("POST /api/reservations", () => {
    it("devuelve 401 si no hay sesión autenticada", async () => {
      (globalThis as any).__mockSession = null;

      const req = new Request("http://localhost:3000/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: "2026-11-20",
        }),
      });

      const res = await createReservation(req);
      assert.strictEqual(res.status, 401);
    });

    it("devuelve 400 si la fecha es en el pasado", async () => {
      (globalThis as any).__mockSession = {
        user: { id: "user-socio", role: "SOCIO", email: "socio@example.com" },
      };

      const req = new Request("http://localhost:3000/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: "2020-01-01",
        }),
      });

      const res = await createReservation(req);
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /fecha de reserva debe ser futura/i);
    });

    it("crea reserva con estado PENDIENTE_PAGO y calcula total en servidor", async () => {
      (globalThis as any).__mockSession = {
        user: { id: "user-socio-1", role: "SOCIO", email: "socio@example.com" },
      };

      (prisma.family as any).findUnique = async ({ where }: any) => {
        if (where.ownerId === "user-socio-1" || where.id === "family-1") {
          return { id: "family-1", name: "Familia Gómez", ownerId: "user-socio-1" };
        }
        return null;
      };

      (prisma.reservation as any).findFirst = async () => null;

      (prisma.addOnSpace as any).findMany = async () => [
        { id: "space-quincho", name: "quincho", pricePerUnit: 25000, capacityGuests: null },
      ];

      let createdData: any = null;
      (prisma.reservation as any).create = async ({ data }: any) => {
        createdData = data;
        return {
          id: "res-123",
          familyId: data.familyId,
          date: data.date,
          status: data.status,
          totalAmount: data.totalAmount,
          createdAt: new Date(),
          updatedAt: new Date(),
          extraPersons: data.extraPersons?.create ?? [],
          addOns: data.addOns?.create ?? [],
        };
      };

      const req = new Request("http://localhost:3000/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: "2026-11-25",
          extraPersons: [
            { fullName: "Primo Juan", usesPool: true },
            { fullName: "Tío Carlos", usesPool: false },
          ],
          addOns: [
            { addOnSpaceId: "space-quincho", quantity: 1 },
          ],
        }),
      });

      const res = await createReservation(req);
      assert.strictEqual(res.status, 201);
      const data = await res.json();

      assert.strictEqual(data.id, "res-123");
      assert.strictEqual(data.status, "PENDIENTE_PAGO");
      // 2 extra persons: 2 * 2000 = 4000
      // 1 with pool: 4000
      // quincho: 25000
      // Total: 33000
      assert.strictEqual(data.totalAmount, 33000);
      assert.strictEqual(createdData.status, "PENDIENTE_PAGO");
      assert.strictEqual(createdData.totalAmount, 33000);
    });

    it("devuelve 409 si ya existe una reserva activa para el mismo family+date", async () => {
      (globalThis as any).__mockSession = {
        user: { id: "user-socio-1", role: "SOCIO", email: "socio@example.com" },
      };

      (prisma.family as any).findUnique = async () => ({
        id: "family-1",
        name: "Familia Gómez",
        ownerId: "user-socio-1",
      });

      // Existing reservation found
      (prisma.reservation as any).findFirst = async () => ({
        id: "res-existing",
        familyId: "family-1",
        date: new Date("2026-11-25T00:00:00.000Z"),
        status: "PENDIENTE_PAGO",
      });

      const req = new Request("http://localhost:3000/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: "2026-11-25",
        }),
      });

      const res = await createReservation(req);
      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.match(data.error, /ya existe una reserva/i);
    });
  });

  describe("GET /api/reservations/[id]", () => {
    it("devuelve 404 si la reserva no existe", async () => {
      (globalThis as any).__mockSession = {
        user: { id: "user-socio-1", role: "SOCIO", email: "socio@example.com" },
      };

      (prisma.reservation as any).findUnique = async () => null;

      const req = new Request("http://localhost:3000/api/reservations/nonexistent");
      const res = await getReservationById(req, {
        params: Promise.resolve({ id: "nonexistent" }),
      });

      assert.strictEqual(res.status, 404);
    });

    it("devuelve los datos de la reserva para el dueño de la familia", async () => {
      (globalThis as any).__mockSession = {
        user: { id: "user-socio-1", role: "SOCIO", email: "socio@example.com" },
      };

      (prisma.reservation as any).findUnique = async () => ({
        id: "res-123",
        familyId: "family-1",
        status: "PENDIENTE_PAGO",
        totalAmount: 38000,
        family: { id: "family-1", ownerId: "user-socio-1" },
        extraPersons: [{ id: "ep-1", fullName: "Primo Juan", usesPool: true }],
        addOns: [],
        payments: [],
        qrTokens: [],
      });

      const req = new Request("http://localhost:3000/api/reservations/res-123");
      const res = await getReservationById(req, {
        params: Promise.resolve({ id: "res-123" }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.id, "res-123");
      assert.strictEqual(data.status, "PENDIENTE_PAGO");
    });
  });
});
