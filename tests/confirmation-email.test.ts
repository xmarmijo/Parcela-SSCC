import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { prisma } from "../src/lib/prisma";
import { sendConfirmationEmail, getResendClient } from "../src/lib/email";
import { renderConfirmacionReservaHtml } from "../src/emails/confirmacion-reserva";
import { POST as webhookPost } from "../src/app/api/payments/webhook/route";

describe("Email de Confirmación de Reserva (Task 6)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete (globalThis as any).__mockResend;
    delete (globalThis as any).__mockMercadoPagoPayment;
    process.env = { ...originalEnv };

    // Transaction mock
    (prisma as any).$transaction = async (fn: any) => {
      if (typeof fn === "function") {
        return fn(prisma);
      }
      return Promise.all(fn);
    };
  });

  describe("renderConfirmacionReservaHtml template", () => {
    it("renderiza correctamente los datos de la reserva, familia, espacios, invitados y QR", () => {
      const html = renderConfirmacionReservaHtml({
        reservationId: "res-test-123",
        familyName: "Familia González",
        titularName: "gonzalez@example.com",
        dateFormatted: "sábado, 21 de noviembre de 2026",
        spacesList: ["Quincho", "Sala de eventos"],
        extraGuests: [
          { fullName: "Carlos Soto", usesPool: true },
          { fullName: "Ana Morales", usesPool: false },
        ],
        totalAmountFormatted: "$38.000 CLP",
        qrToken: "token-qr-uuid-test",
        qrDataUrl: "data:image/png;base64,mockQrImageData",
        validationUrl: "http://localhost:3000/validar/token-qr-uuid-test",
      });

      assert.match(html, /Familia Gonz[aá]lez/);
      assert.match(html, /21 de noviembre de 2026/);
      assert.match(html, /Quincho/);
      assert.match(html, /Sala de eventos/);
      assert.match(html, /Carlos Soto \(con piscina\)/);
      assert.match(html, /Ana Morales/);
      assert.match(html, /\$38\.000 CLP/);
      assert.match(html, /token-qr-uuid-test/);
      assert.match(html, /mockQrImageData/);
      assert.match(html, /http:\/\/localhost:3000\/validar\/token-qr-uuid-test/);
    });

    it("renderiza texto por defecto cuando no hay espacios adicionales ni invitados extra", () => {
      const html = renderConfirmacionReservaHtml({
        reservationId: "res-basic",
        familyName: "Familia Pérez",
        titularName: "perez@example.com",
        dateFormatted: "domingo, 22 de noviembre de 2026",
        spacesList: [],
        extraGuests: [],
        totalAmountFormatted: "$0 CLP",
        qrToken: "token-qr-basic",
        qrDataUrl: "data:image/png;base64,basicQr",
        validationUrl: "http://localhost:3000/validar/token-qr-basic",
      });

      assert.match(html, /Uso general de parcela/);
      assert.match(html, /Sin invitados extra/);
      assert.match(html, /\$0 CLP/);
    });
  });

  describe("sendConfirmationEmail con mock de Resend", () => {
    it("llama al proveedor Resend con el email del titular y contiene el token del QR", async () => {
      let sentPayload: any = null;
      (globalThis as any).__mockResend = {
        emails: {
          send: async (payload: any) => {
            sentPayload = payload;
            return { data: { id: "resend-msg-123" }, error: null };
          },
        },
      };

      const mockReservation = {
        id: "res-email-1",
        date: new Date("2026-11-28T00:00:00.000Z"),
        totalAmount: 42000,
        status: "CONFIRMADA",
        family: {
          id: "fam-1",
          name: "Familia Gómez",
          owner: {
            id: "user-gomez",
            email: "titular.gomez@sscc.cl",
            name: "María Gómez",
          },
        },
        addOns: [
          {
            quantity: 1,
            addOnSpace: { name: "Quincho" },
          },
        ],
        extraPersons: [
          {
            fullName: "Pedro Gómez",
            usesPool: true,
          },
        ],
        payments: [
          {
            status: "APPROVED",
            amount: 42000,
          },
        ],
        qrTokens: [
          {
            token: "qr-token-super-secure-uuid",
          },
        ],
      };

      const result = await sendConfirmationEmail(mockReservation);

      assert.strictEqual(result.success, true);
      assert.ok(sentPayload, "Se debió llamar a resend.emails.send");
      assert.strictEqual(sentPayload.to, "titular.gomez@sscc.cl");
      assert.match(sentPayload.subject, /Confirmación de Reserva/i);
      assert.match(sentPayload.subject, /Familia Gómez/);

      // Verify HTML content contains required details
      assert.match(sentPayload.html, /qr-token-super-secure-uuid/);
      assert.match(sentPayload.html, /Familia Gómez/);
      assert.match(sentPayload.html, /Quincho/);
      assert.match(sentPayload.html, /Pedro Gómez \(con piscina\)/);
      assert.match(sentPayload.html, /\$42\.000 CLP/);
      assert.match(sentPayload.html, /validar\/qr-token-super-secure-uuid/);
    });

    it("resuelve reserva por ID consultando la base de datos", async () => {
      let sentPayload: any = null;
      (globalThis as any).__mockResend = {
        emails: {
          send: async (payload: any) => {
            sentPayload = payload;
            return { data: { id: "resend-msg-db-1" }, error: null };
          },
        },
      };

      (prisma.reservation as any).findUnique = async ({ where }: any) => {
        if (where.id === "res-db-lookup") {
          return {
            id: "res-db-lookup",
            date: new Date("2026-12-05T00:00:00.000Z"),
            totalAmount: 20000,
            family: {
              name: "Familia Rojas",
              owner: {
                email: "socio.rojas@gmail.com",
              },
            },
            addOns: [],
            extraPersons: [],
            payments: [{ status: "APPROVED", amount: 20000 }],
            qrTokens: [{ token: "token-rojas-qr" }],
          };
        }
        return null;
      };

      const result = await sendConfirmationEmail("res-db-lookup");
      assert.strictEqual(result.success, true);
      assert.ok(sentPayload);
      assert.strictEqual(sentPayload.to, "socio.rojas@gmail.com");
      assert.match(sentPayload.html, /token-rojas-qr/);
    });

    it("omite el envío de forma segura cuando no hay RESEND_API_KEY", async () => {
      delete process.env.RESEND_API_KEY;
      delete (globalThis as any).__mockResend;

      const mockReservation = {
        id: "res-no-key",
        date: new Date(),
        totalAmount: 10000,
        family: {
          name: "Familia Sin Key",
          owner: { email: "socio@example.com" },
        },
        qrTokens: [{ token: "token-no-key" }],
      };

      const result = await sendConfirmationEmail(mockReservation);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.skipped, true);
      assert.strictEqual(result.reason, "NO_RESEND_API_KEY");
    });

    it("maneja reserva inexistente sin lanzar excepción", async () => {
      (globalThis as any).__mockResend = { emails: { send: async () => ({}) } };
      (prisma.reservation as any).findUnique = async () => null;

      const result = await sendConfirmationEmail("res-not-found");
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, "RESERVATION_NOT_FOUND");
    });

    it("maneja reserva sin email de titular", async () => {
      (globalThis as any).__mockResend = { emails: { send: async () => ({}) } };
      const reservationWithoutEmail = {
        id: "res-no-email",
        family: { name: "Familia Anónima", owner: null },
        qrTokens: [{ token: "token-123" }],
      };

      const result = await sendConfirmationEmail(reservationWithoutEmail);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, "NO_RECIPIENT_EMAIL");
    });

    it("maneja error devuelto por la API de Resend", async () => {
      (globalThis as any).__mockResend = {
        emails: {
          send: async () => ({
            data: null,
            error: { message: "Invalid API key or unverified domain" },
          }),
        },
      };

      const mockReservation = {
        id: "res-api-error",
        date: new Date(),
        family: {
          name: "Familia Error",
          owner: { email: "error@example.com" },
        },
        qrTokens: [{ token: "token-err" }],
      };

      const result = await sendConfirmationEmail(mockReservation);
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe("Disparo desde Webhook de Pagos (Integración Task 5 & 6)", () => {
    it("dispara sendConfirmationEmail tras pago aprobado y genera QR en el email", async () => {
      const mockPaymentId = "mp-webhook-email-test";
      const reservationId = "res-webhook-email";
      let capturedEmailPayload: any = null;

      (globalThis as any).__mockResend = {
        emails: {
          send: async (payload: any) => {
            capturedEmailPayload = payload;
            return { data: { id: "resend-webhook-msg" }, error: null };
          },
        },
      };

      (globalThis as any).__mockMercadoPagoPayment = {
        get: async () => ({
          id: mockPaymentId,
          status: "approved",
          transaction_amount: 35000,
          date_approved: "2026-11-04T15:00:00.000Z",
          external_reference: reservationId,
        }),
      };

      // Mock database state
      const reservationRecord = {
        id: reservationId,
        date: new Date("2026-11-25T00:00:00.000Z"),
        status: "PENDIENTE_PAGO",
        totalAmount: 35000,
        familyId: "fam-wh",
        family: {
          id: "fam-wh",
          name: "Familia Webhook",
          owner: {
            id: "user-wh",
            email: "socio.webhook@colegio.cl",
            name: "Socio Webhook",
          },
        },
        addOns: [],
        extraPersons: [],
        payments: [],
        qrTokens: [] as any[],
      };

      (prisma.payment as any).findUnique = async () => null;
      (prisma.reservation as any).findUnique = async ({ where }: any) => {
        if (where.id === reservationId) {
          return reservationRecord;
        }
        return null;
      };
      (prisma.payment as any).findFirst = async () => null;
      (prisma.payment as any).create = async ({ data }: any) => ({
        id: "pay-wh-1",
        ...data,
      });
      (prisma.reservation as any).update = async ({ data }: any) => {
        reservationRecord.status = data.status;
        return reservationRecord;
      };
      (prisma.qrToken as any).findFirst = async () => null;
      (prisma.qrToken as any).create = async ({ data }: any) => {
        const qr = { id: "qr-wh-1", ...data };
        reservationRecord.qrTokens.push(qr);
        return qr;
      };

      const req = new Request(
        `http://localhost:3000/api/payments/webhook?id=${mockPaymentId}&type=payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: mockPaymentId, type: "payment" }),
        }
      );

      const res = await webhookPost(req);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.qrToken);

      // Verify that sendConfirmationEmail was triggered and reached Resend
      assert.ok(capturedEmailPayload, "Se debió enviar el correo desde el webhook");
      assert.strictEqual(capturedEmailPayload.to, "socio.webhook@colegio.cl");
      assert.match(capturedEmailPayload.html, new RegExp(data.qrToken));
      assert.match(capturedEmailPayload.html, /Familia Webhook/);
      assert.match(capturedEmailPayload.html, /\$35\.000 CLP/);
    });

    it("si falla el envío de correo, el webhook NO revierte ni falla la confirmación", async () => {
      const mockPaymentId = "mp-pay-email-failure";
      const reservationId = "res-email-fail";

      // Mock Resend throwing an error
      (globalThis as any).__mockResend = {
        emails: {
          send: async () => {
            throw new Error("Resend network failure");
          },
        },
      };

      (globalThis as any).__mockMercadoPagoPayment = {
        get: async () => ({
          id: mockPaymentId,
          status: "approved",
          transaction_amount: 15000,
          date_approved: "2026-11-04T15:30:00.000Z",
          external_reference: reservationId,
        }),
      };

      const reservationRecord = {
        id: reservationId,
        date: new Date("2026-11-26T00:00:00.000Z"),
        status: "PENDIENTE_PAGO",
        totalAmount: 15000,
        familyId: "fam-fail",
        family: {
          id: "fam-fail",
          name: "Familia Error Resend",
          owner: {
            email: "error.resend@example.com",
          },
        },
        addOns: [],
        extraPersons: [],
        payments: [],
        qrTokens: [] as any[],
      };

      (prisma.payment as any).findUnique = async () => null;
      (prisma.reservation as any).findUnique = async () => reservationRecord;
      (prisma.payment as any).findFirst = async () => null;
      (prisma.payment as any).create = async ({ data }: any) => ({
        id: "pay-fail-1",
        ...data,
      });
      (prisma.reservation as any).update = async ({ data }: any) => {
        reservationRecord.status = data.status;
        return reservationRecord;
      };
      (prisma.qrToken as any).findFirst = async () => null;
      (prisma.qrToken as any).create = async ({ data }: any) => {
        const qr = { id: "qr-fail-1", ...data };
        reservationRecord.qrTokens.push(qr);
        return qr;
      };

      const req = new Request(
        `http://localhost:3000/api/payments/webhook?id=${mockPaymentId}&type=payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: mockPaymentId, type: "payment" }),
        }
      );

      const res = await webhookPost(req);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(reservationRecord.status, "CONFIRMADA");
      assert.ok(data.qrToken);
    });
  });

  describe("Step 4: Verificación completa de flujo sandbox con recepción de correo y QR", () => {
    it("simula pago sandbox completo y verifica correo recibido con QR", async () => {
      const sandboxPaymentId = "sandbox-pay-987654";
      const sandboxReservationId = "res-sandbox-flow";
      const socioEmail = "socio.sandbox@familyshop.cl";

      let emailReceivedByResend: any = null;

      // Mock Resend sandbox delivery
      (globalThis as any).__mockResend = {
        emails: {
          send: async (options: any) => {
            emailReceivedByResend = options;
            return {
              data: { id: "resend-sandbox-msg-id" },
              error: null,
            };
          },
        },
      };

      // Mock Mercado Pago sandbox payment approved response
      (globalThis as any).__mockMercadoPagoPayment = {
        get: async ({ id }: any) => {
          assert.strictEqual(String(id), sandboxPaymentId);
          return {
            id: sandboxPaymentId,
            status: "approved",
            status_detail: "accredited",
            transaction_amount: 37000,
            date_approved: "2026-11-04T16:00:00.000Z",
            external_reference: sandboxReservationId,
            payment_method_id: "visa",
            payment_type_id: "credit_card",
          };
        },
      };

      // Database state for sandbox reservation
      const dbReservation: any = {
        id: sandboxReservationId,
        date: new Date("2026-11-30T00:00:00.000Z"),
        status: "PENDIENTE_PAGO",
        totalAmount: 37000,
        familyId: "fam-sandbox-1",
        family: {
          id: "fam-sandbox-1",
          name: "Familia San Martín",
          owner: {
            id: "user-socio-sandbox",
            email: socioEmail,
            name: "Socio San Martín",
          },
        },
        addOns: [
          {
            quantity: 1,
            addOnSpace: { id: "sp-1", name: "Quincho" },
          },
        ],
        extraPersons: [
          {
            id: "ep-1",
            fullName: "Ignacio Soto",
            usesPool: true,
          },
        ],
        payments: [] as any[],
        qrTokens: [] as any[],
      };

      (prisma.payment as any).findUnique = async ({ where }: any) => {
        return (
          dbReservation.payments.find(
            (p: any) => p.providerPaymentId === where.providerPaymentId
          ) || null
        );
      };

      (prisma.reservation as any).findUnique = async ({ where }: any) => {
        if (where.id === sandboxReservationId) {
          return dbReservation;
        }
        return null;
      };

      (prisma.payment as any).findFirst = async () => null;

      (prisma.payment as any).create = async ({ data }: any) => {
        const pay = { id: "pay-sandbox-rec-1", ...data };
        dbReservation.payments.push(pay);
        return pay;
      };

      (prisma.reservation as any).update = async ({ data }: any) => {
        dbReservation.status = data.status;
        return dbReservation;
      };

      (prisma.qrToken as any).findFirst = async ({ where }: any) => {
        return (
          dbReservation.qrTokens.find(
            (q: any) => q.reservationId === where.reservationId
          ) || null
        );
      };

      (prisma.qrToken as any).create = async ({ data }: any) => {
        const qr = { id: "qr-sandbox-rec-1", ...data };
        dbReservation.qrTokens.push(qr);
        return qr;
      };

      // 1. Simular webhook de pago aprobado desde sandbox
      const webhookRequest = new Request(
        `http://localhost:3000/api/payments/webhook?data.id=${sandboxPaymentId}&type=payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "payment.created",
            data: { id: sandboxPaymentId },
          }),
        }
      );

      const webhookResponse = await webhookPost(webhookRequest);
      assert.strictEqual(webhookResponse.status, 200);

      const responseBody = await webhookResponse.json();
      assert.strictEqual(responseBody.success, true);
      assert.strictEqual(responseBody.reservationId, sandboxReservationId);
      assert.ok(responseBody.qrToken, "Se debió generar token QR");

      // 2. Verificar que la reserva fue actualizada a CONFIRMADA
      assert.strictEqual(dbReservation.status, "CONFIRMADA");

      // 3. Verificar que el correo fue recibido en el proveedor sandbox (Resend)
      assert.ok(emailReceivedByResend, "El correo de confirmación debió enviarse a Resend");
      assert.strictEqual(emailReceivedByResend.to, socioEmail);
      assert.match(emailReceivedByResend.subject, /Confirmación de Reserva.*Familia San Martín/i);

      // 4. Verificar contenido del correo recibido: fecha, familia, espacios, invitados, monto, QR
      const html = emailReceivedByResend.html;
      assert.match(html, /Familia San Martín/);
      assert.match(html, /30 de noviembre de 2026/);
      assert.match(html, /Quincho/);
      assert.match(html, /Ignacio Soto \(con piscina\)/);
      assert.match(html, /\$37\.000 CLP/);
      assert.match(html, new RegExp(responseBody.qrToken));
      assert.match(html, /data:image\/png;base64/);
      assert.match(html, new RegExp(`/validar/${responseBody.qrToken}`));
    });
  });
});
