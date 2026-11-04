import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { prisma } from "../src/lib/prisma";
import { POST as createPreference } from "../src/app/api/payments/create-preference/route";
import { POST as webhookPost, GET as webhookGet } from "../src/app/api/payments/webhook/route";

describe("Payments & Webhook API Endpoints", () => {
  beforeEach(() => {
    delete (globalThis as any).__mockSession;
    delete (globalThis as any).__mockMercadoPagoPreference;
    delete (globalThis as any).__mockMercadoPagoPayment;

    // Transaction mock
    (prisma as any).$transaction = async (fn: any) => {
      if (typeof fn === "function") {
        return fn(prisma);
      }
      return Promise.all(fn);
    };
  });

  describe("POST /api/payments/create-preference", () => {
    it("devuelve 401 si no hay sesión autenticada", async () => {
      (globalThis as any).__mockSession = null;

      const req = new Request("http://localhost:3000/api/payments/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: "res-1" }),
      });

      const res = await createPreference(req);
      assert.strictEqual(res.status, 401);
    });

    it("devuelve 404 si la reserva no existe", async () => {
      (globalThis as any).__mockSession = {
        user: { id: "user-socio", role: "SOCIO" },
      };

      (prisma.reservation as any).findUnique = async () => null;

      const req = new Request("http://localhost:3000/api/payments/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: "res-not-found" }),
      });

      const res = await createPreference(req);
      assert.strictEqual(res.status, 404);
    });

    it("devuelve 403 si el usuario no es dueño de la familia ni admin", async () => {
      (globalThis as any).__mockSession = {
        user: { id: "intruder-user", role: "SOCIO" },
      };

      (prisma.reservation as any).findUnique = async () => ({
        id: "res-1",
        familyId: "fam-1",
        family: { id: "fam-1", ownerId: "real-owner" },
      });
      (prisma.familyMember as any).findFirst = async () => null;

      const req = new Request("http://localhost:3000/api/payments/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: "res-1" }),
      });

      const res = await createPreference(req);
      assert.strictEqual(res.status, 403);
    });

    it("devuelve 400 si la reserva ya está confirmada", async () => {
      (globalThis as any).__mockSession = {
        user: { id: "owner-user", role: "SOCIO" },
      };

      (prisma.reservation as any).findUnique = async () => ({
        id: "res-1",
        status: "CONFIRMADA",
        totalAmount: 25000,
        familyId: "fam-1",
        family: { id: "fam-1", ownerId: "owner-user" },
      });

      const req = new Request("http://localhost:3000/api/payments/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: "res-1" }),
      });

      const res = await createPreference(req);
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /ya se encuentra confirmada/i);
    });

    it("crea preferencia en Mercado Pago con el total de la reserva y registra pending payment", async () => {
      (globalThis as any).__mockSession = {
        user: { id: "owner-user", role: "SOCIO" },
      };

      (prisma.reservation as any).findUnique = async () => ({
        id: "res-100",
        date: new Date("2026-11-20T00:00:00.000Z"),
        status: "PENDIENTE_PAGO",
        totalAmount: 38000,
        familyId: "fam-100",
        family: { id: "fam-100", name: "Familia Pérez", ownerId: "owner-user" },
        addOns: [],
        extraPersons: [],
      });

      let preferencePayload: any = null;
      (globalThis as any).__mockMercadoPagoPreference = {
        create: async ({ body }: any) => {
          preferencePayload = body;
          return {
            id: "pref-abc-123",
            init_point: "https://www.mercadopago.cl/checkout/v1/redirect?pref_id=pref-abc-123",
            sandbox_init_point: "https://sandbox.mercadopago.cl/checkout/v1/redirect?pref_id=pref-abc-123",
          };
        },
      };

      (prisma.payment as any).findFirst = async () => null;
      let createdPayment: any = null;
      (prisma.payment as any).create = async ({ data }: any) => {
        createdPayment = data;
        return { id: "pay-1", ...data };
      };

      const req = new Request("http://localhost:3000/api/payments/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: "res-100" }),
      });

      const res = await createPreference(req);
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert.strictEqual(data.preferenceId, "pref-abc-123");
      assert.strictEqual(
        data.init_point,
        "https://www.mercadopago.cl/checkout/v1/redirect?pref_id=pref-abc-123"
      );

      // Verify preference payload sent to Mercado Pago
      assert.strictEqual(preferencePayload.external_reference, "res-100");
      assert.strictEqual(preferencePayload.items[0].unit_price, 38000);
      assert.strictEqual(preferencePayload.items[0].id, "res-100");

      // Verify pending payment record created
      assert.ok(createdPayment);
      assert.strictEqual(createdPayment.reservationId, "res-100");
      assert.strictEqual(createdPayment.amount, 38000);
      assert.strictEqual(createdPayment.status, "PENDING");
    });
  });

  describe("POST /api/payments/webhook & Idempotency", () => {
    it("responde 200 a GET para verificación de salud", async () => {
      const res = await webhookGet();
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.ok, true);
    });

    it("ignora notificaciones sin paymentId sin fallar", async () => {
      const req = new Request("http://localhost:3000/api/payments/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", type: "other" }),
      });

      const res = await webhookPost(req);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.ignored, true);
    });

    it("procesa pago aprobado: crea Payment, actualiza Reservation a CONFIRMADA y genera QrToken", async () => {
      const mockPaymentId = "mp-pay-999";
      const reservationId = "res-200";

      (globalThis as any).__mockMercadoPagoPayment = {
        get: async ({ id }: any) => {
          assert.strictEqual(String(id), mockPaymentId);
          return {
            id: mockPaymentId,
            status: "approved",
            transaction_amount: 38000,
            date_approved: "2026-11-04T12:00:00.000Z",
            external_reference: reservationId,
          };
        },
      };

      // Mock database state
      (prisma.payment as any).findUnique = async ({ where }: any) => {
        if (where.providerPaymentId === mockPaymentId) {
          return null; // Not processed yet
        }
        return null;
      };

      (prisma.reservation as any).findUnique = async ({ where }: any) => {
        if (where.id === reservationId) {
          return {
            id: reservationId,
            status: "PENDIENTE_PAGO",
            totalAmount: 38000,
            qrTokens: [],
          };
        }
        return null;
      };

      let createdPaymentData: any = null;
      (prisma.payment as any).findFirst = async () => null;
      (prisma.payment as any).create = async ({ data }: any) => {
        createdPaymentData = data;
        return { id: "pay-new-1", ...data };
      };

      let updatedReservationData: any = null;
      (prisma.reservation as any).update = async ({ where, data }: any) => {
        updatedReservationData = data;
        return { id: where.id, ...data };
      };

      let createdQrData: any = null;
      (prisma.qrToken as any).findFirst = async () => null;
      (prisma.qrToken as any).create = async ({ data }: any) => {
        createdQrData = data;
        return { id: "qr-new-1", ...data };
      };

      const req = new Request(
        `http://localhost:3000/api/payments/webhook?data.id=${mockPaymentId}&type=payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "payment.created",
            data: { id: mockPaymentId },
          }),
        }
      );

      const res = await webhookPost(req);
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert.strictEqual(data.success, true);
      assert.strictEqual(data.reservationId, reservationId);
      assert.ok(data.qrToken);

      // Verify payment was created with APPROVED status
      assert.ok(createdPaymentData);
      assert.strictEqual(createdPaymentData.providerPaymentId, mockPaymentId);
      assert.strictEqual(createdPaymentData.status, "APPROVED");
      assert.strictEqual(createdPaymentData.amount, 38000);

      // Verify reservation was confirmed
      assert.ok(updatedReservationData);
      assert.strictEqual(updatedReservationData.status, "CONFIRMADA");

      // Verify opaque UUID QR Token was generated
      assert.ok(createdQrData);
      assert.strictEqual(createdQrData.reservationId, reservationId);
      assert.match(
        createdQrData.token,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it("IDEMPOTENCIA: procesar el mismo providerPaymentId dos veces NO crea dos pagos ni dos QR", async () => {
      const mockPaymentId = "mp-pay-duplicate-123";
      const reservationId = "res-idempotent";

      let paymentCreateCount = 0;
      let qrCreateCount = 0;
      let reservationUpdateCount = 0;

      // In-memory mock store
      const paymentsStore: any[] = [];
      const qrTokensStore: any[] = [];
      const reservationsStore: Record<string, any> = {
        [reservationId]: {
          id: reservationId,
          status: "PENDIENTE_PAGO",
          totalAmount: 25000,
        },
      };

      (globalThis as any).__mockMercadoPagoPayment = {
        get: async () => ({
          id: mockPaymentId,
          status: "approved",
          transaction_amount: 25000,
          date_approved: "2026-11-04T12:30:00.000Z",
          external_reference: reservationId,
        }),
      };

      (prisma.payment as any).findUnique = async ({ where }: any) => {
        return (
          paymentsStore.find(
            (p) => p.providerPaymentId === where.providerPaymentId
          ) || null
        );
      };

      (prisma.reservation as any).findUnique = async ({ where }: any) => {
        return reservationsStore[where.id] || null;
      };

      (prisma.payment as any).findFirst = async () => null;

      (prisma.payment as any).create = async ({ data }: any) => {
        paymentCreateCount++;
        const record = { id: `pay-${paymentCreateCount}`, ...data };
        paymentsStore.push(record);
        return record;
      };

      (prisma.reservation as any).update = async ({ where, data }: any) => {
        reservationUpdateCount++;
        reservationsStore[where.id] = { ...reservationsStore[where.id], ...data };
        return reservationsStore[where.id];
      };

      (prisma.qrToken as any).findFirst = async ({ where }: any) => {
        return (
          qrTokensStore.find((q) => q.reservationId === where.reservationId) ||
          null
        );
      };

      (prisma.qrToken as any).create = async ({ data }: any) => {
        qrCreateCount++;
        const record = { id: `qr-${qrCreateCount}`, ...data };
        qrTokensStore.push(record);
        return record;
      };

      // First webhook call: should process successfully
      const req1 = new Request("http://localhost:3000/api/payments/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "payment.created",
          data: { id: mockPaymentId },
        }),
      });

      const res1 = await webhookPost(req1);
      assert.strictEqual(res1.status, 200);
      const data1 = await res1.json();
      assert.strictEqual(data1.success, true);

      assert.strictEqual(paymentCreateCount, 1, "Debe haber creado exactamente 1 pago");
      assert.strictEqual(qrCreateCount, 1, "Debe haber creado exactamente 1 QR");
      assert.strictEqual(reservationUpdateCount, 1, "Debe haber actualizado la reserva 1 vez");

      // Second webhook call with the SAME providerPaymentId
      const req2 = new Request("http://localhost:3000/api/payments/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "payment.updated",
          data: { id: mockPaymentId },
        }),
      });

      const res2 = await webhookPost(req2);
      assert.strictEqual(res2.status, 200);
      const data2 = await res2.json();

      // Must acknowledge already processed without duplicating records
      assert.strictEqual(data2.status, "already_processed");
      assert.strictEqual(
        paymentCreateCount,
        1,
        "Idempotencia: NO debe crear un segundo pago"
      );
      assert.strictEqual(
        qrCreateCount,
        1,
        "Idempotencia: NO debe crear un segundo QR"
      );
      assert.strictEqual(
        reservationUpdateCount,
        1,
        "Idempotencia: NO debe re-actualizar la reserva"
      );
    });

    it("no confirma reserva ni genera QR si el pago no es aprobado (rechazado)", async () => {
      const mockPaymentId = "mp-pay-rejected";
      const reservationId = "res-rejected";

      let qrCreateCalled = false;
      let reservationUpdated = false;

      (globalThis as any).__mockMercadoPagoPayment = {
        get: async () => ({
          id: mockPaymentId,
          status: "rejected",
          transaction_amount: 15000,
          external_reference: reservationId,
        }),
      };

      (prisma.payment as any).findUnique = async () => null;
      (prisma.payment as any).create = async ({ data }: any) => ({
        id: "pay-rej",
        ...data,
      });
      (prisma.reservation as any).update = async () => {
        reservationUpdated = true;
      };
      (prisma.qrToken as any).create = async () => {
        qrCreateCalled = true;
      };

      const req = new Request("http://localhost:3000/api/payments/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { id: mockPaymentId } }),
      });

      const res = await webhookPost(req);
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert.strictEqual(data.status, "rejected");
      assert.strictEqual(data.processed, false);
      assert.strictEqual(qrCreateCalled, false, "No debe generar QR para pagos rechazados");
      assert.strictEqual(reservationUpdated, false, "No debe confirmar reserva para pagos rechazados");
    });
  });
});
