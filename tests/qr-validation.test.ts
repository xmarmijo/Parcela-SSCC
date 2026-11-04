import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { renderToStaticMarkup } from "react-dom/server";
import { prisma } from "../src/lib/prisma";
import {
  generateQrDataUrl,
  generateQrBuffer,
  validateQrToken,
  getValidationUrl,
} from "../src/lib/qr";
import { GET as getQrByToken } from "../src/app/api/qr/[token]/route";
import ValidarPage from "../src/app/validar/[token]/page";

describe("QR Generation and Validation", () => {
  beforeEach(() => {
    // Reset mocks if needed
  });

  describe("src/lib/qr.ts", () => {
    it("genera URL de validación correcta", () => {
      const url = getValidationUrl("test-token-uuid");
      assert.ok(url.includes("/validar/test-token-uuid"));
    });

    it("genera data URL válida de imagen PNG", async () => {
      const dataUrl = await generateQrDataUrl("token-123");
      assert.ok(dataUrl.startsWith("data:image/png;base64,"));
      assert.ok(dataUrl.length > 100);
    });

    it("genera Buffer PNG válido", async () => {
      const buffer = await generateQrBuffer("token-123");
      assert.ok(Buffer.isBuffer(buffer));
      assert.ok(buffer.length > 50);
      // Check PNG magic bytes: \x89PNG
      assert.strictEqual(buffer[0], 0x89);
      assert.strictEqual(buffer[1], 0x50);
      assert.strictEqual(buffer[2], 0x4e);
      assert.strictEqual(buffer[3], 0x47);
    });

    it("validateQrToken: devuelve INVALID para token inexistente", async () => {
      (prisma.qrToken as any).findUnique = async () => null;

      const result = await validateQrToken("non-existent");
      assert.strictEqual(result.status, "INVALID");
      assert.strictEqual(result.qrRecord, null);
    });

    it("validateQrToken: marca usedAt en el primer uso y devuelve VALID", async () => {
      const initialRecord = {
        id: "qr-1",
        token: "token-valid-first",
        usedAt: null,
        reservationId: "res-1",
        reservation: {
          id: "res-1",
          date: new Date("2026-11-20"),
          totalAmount: 25000,
          family: { name: "Familia González" },
          addOns: [],
          extraPersons: [],
        },
      };

      (prisma.qrToken as any).findUnique = async ({ where }: any) => {
        if (where.token === "token-valid-first") {
          return initialRecord;
        }
        return null;
      };

      let updateData: any = null;
      (prisma.qrToken as any).update = async ({ where, data, include }: any) => {
        updateData = data;
        return {
          ...initialRecord,
          usedAt: data.usedAt,
        };
      };

      const result = await validateQrToken("token-valid-first");
      assert.strictEqual(result.status, "VALID");
      assert.ok(result.usedAt instanceof Date);
      assert.ok(updateData?.usedAt instanceof Date);
    });

    it("validateQrToken: devuelve ALREADY_USED si ya tiene usedAt y no sobreescribe la fecha", async () => {
      const originalUsedAt = new Date("2026-11-04T10:00:00.000Z");
      const usedRecord = {
        id: "qr-2",
        token: "token-already-used",
        usedAt: originalUsedAt,
        reservationId: "res-2",
        reservation: {
          id: "res-2",
          date: new Date("2026-11-20"),
          totalAmount: 30000,
          family: { name: "Familia Morales" },
          addOns: [],
          extraPersons: [],
        },
      };

      let updateCalled = false;
      (prisma.qrToken as any).findUnique = async () => usedRecord;
      (prisma.qrToken as any).update = async () => {
        updateCalled = true;
      };

      const result = await validateQrToken("token-already-used");
      assert.strictEqual(result.status, "ALREADY_USED");
      assert.strictEqual(result.usedAt, originalUsedAt);
      assert.strictEqual(updateCalled, false, "No debe llamar a update si ya estaba usado");
    });
  });

  describe("GET /api/qr/[token]", () => {
    it("devuelve 404 si el token no existe", async () => {
      (prisma.qrToken as any).findUnique = async () => null;

      const req = new Request("http://localhost:3000/api/qr/token-fake");
      const res = await getQrByToken(req, {
        params: Promise.resolve({ token: "token-fake" }),
      });

      assert.strictEqual(res.status, 404);
      const data = await res.json();
      assert.match(data.error, /no encontrado/i);
    });

    it("devuelve JSON con dataUrl si se solicita format=json", async () => {
      (prisma.qrToken as any).findUnique = async () => ({
        id: "qr-1",
        token: "token-real",
        usedAt: null,
        reservationId: "res-1",
      });

      const req = new Request("http://localhost:3000/api/qr/token-real?format=json");
      const res = await getQrByToken(req, {
        params: Promise.resolve({ token: "token-real" }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.token, "token-real");
      assert.strictEqual(data.valid, true);
      assert.ok(data.dataUrl.startsWith("data:image/png;base64,"));
      assert.ok(data.validationUrl.includes("/validar/token-real"));
    });

    it("devuelve imagen PNG por defecto", async () => {
      (prisma.qrToken as any).findUnique = async () => ({
        id: "qr-1",
        token: "token-real",
        usedAt: null,
        reservationId: "res-1",
      });

      const req = new Request("http://localhost:3000/api/qr/token-real");
      const res = await getQrByToken(req, {
        params: Promise.resolve({ token: "token-real" }),
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get("Content-Type"), "image/png");
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      assert.strictEqual(buffer[0], 0x89);
      assert.strictEqual(buffer[1], 0x50);
      assert.strictEqual(buffer[2], 0x4e);
      assert.strictEqual(buffer[3], 0x47);
    });
  });

  describe("Página /validar/[token]", () => {
    it("renderiza vista de INVALID si el token no existe", async () => {
      (prisma.qrToken as any).findUnique = async () => null;

      const pageJsx = await ValidarPage({
        params: Promise.resolve({ token: "token-invalido" }),
      });

      assert.ok(pageJsx);
      const html = renderToStaticMarkup(pageJsx);
      assert.ok(html.includes("Código QR Inválido"));
      assert.ok(html.includes("token-invalido"));
    });

    it("marca usedAt y renderiza Ingreso Autorizado en primer uso", async () => {
      const mockRecord = {
        id: "qr-page-1",
        token: "token-primer-uso",
        usedAt: null,
        reservationId: "res-10",
        reservation: {
          id: "res-10",
          date: new Date("2026-11-25T00:00:00.000Z"),
          status: "CONFIRMADA",
          totalAmount: 20000,
          family: { name: "Familia Tapia", owner: { email: "tapia@example.com" } },
          addOns: [{ id: "addon-1", addOnSpace: { name: "quincho" }, quantity: 1 }],
          extraPersons: [{ id: "ep-1", fullName: "Ignacio Tapia", usesPool: true }],
        },
      };

      (prisma.qrToken as any).findUnique = async () => mockRecord;
      (prisma.qrToken as any).update = async ({ data }: any) => ({
        ...mockRecord,
        usedAt: data.usedAt,
      });

      const pageJsx = await ValidarPage({
        params: Promise.resolve({ token: "token-primer-uso" }),
      });

      assert.ok(pageJsx);
      const html = renderToStaticMarkup(pageJsx);
      assert.ok(html.includes("Ingreso Autorizado"));
      assert.ok(html.includes("Familia Tapia"));
      assert.ok(html.includes("quincho"));
      assert.ok(html.includes("Ignacio Tapia"));
    });

    it("renderiza QR Ya Utilizado cuando el token ya fue validado", async () => {
      const usedAtDate = new Date("2026-11-04T09:15:00.000Z");
      const mockRecord = {
        id: "qr-page-2",
        token: "token-ya-usado",
        usedAt: usedAtDate,
        reservationId: "res-20",
        reservation: {
          id: "res-20",
          date: new Date("2026-11-25T00:00:00.000Z"),
          status: "CONFIRMADA",
          totalAmount: 0,
          family: { name: "Familia Silva", owner: { email: "silva@example.com" } },
          addOns: [],
          extraPersons: [],
        },
      };

      (prisma.qrToken as any).findUnique = async () => mockRecord;

      const pageJsx = await ValidarPage({
        params: Promise.resolve({ token: "token-ya-usado" }),
      });

      assert.ok(pageJsx);
      const html = renderToStaticMarkup(pageJsx);
      assert.ok(html.includes("Código QR Ya Utilizado"));
      assert.ok(html.includes("Familia Silva"));
    });
  });
});
