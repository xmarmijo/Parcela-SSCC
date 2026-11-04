import { describe, it } from "node:test";
import assert from "node:assert";
import { calculateTotal, DEFAULT_PRICING } from "../src/lib/pricing";

describe("Pricing and calculateTotal", () => {
  it("calcula total con núcleo base + 2 invitados extra + 1 con piscina + quincho según precios de AddOnSpace", () => {
    const reservationInput = {
      extraPersons: [
        { fullName: "Invitado 1", usesPool: true },
        { fullName: "Invitado 2", usesPool: false },
      ],
      addOns: [
        { addOnSpaceId: "space-quincho", name: "quincho", quantity: 1 },
      ],
    };

    const addOnSpaces = [
      { id: "space-quincho", name: "quincho", pricePerUnit: 25000 },
      { id: "space-sala", name: "sala_eventos", pricePerUnit: 50000 },
    ];

    const total = calculateTotal(reservationInput, {
      basePrice: 0,
      extraPersonPrice: 5000,
      poolPrice: 3000,
      addOnSpaces,
    });

    // Base: 0
    // Extra person 1: 5000 + 3000 (pool) = 8000
    // Extra person 2: 5000 + 0 = 5000
    // Quincho: 25000
    // Total: 0 + 8000 + 5000 + 25000 = 38000
    assert.strictEqual(total, 38000);
  });

  it("devuelve 0 para una reserva básica del núcleo familiar sin adicionales ni espacios pagados", () => {
    const total = calculateTotal({
      extraPersons: [],
      addOns: [],
    });

    assert.strictEqual(total, 0);
  });

  it("utiliza los valores por defecto de DEFAULT_PRICING cuando no se suministra config", () => {
    const reservationInput = {
      extraPersons: [
        { fullName: "Extra 1", usesPool: false },
        { fullName: "Extra 2", usesPool: true },
      ],
      addOns: [
        { name: "quincho", pricePerUnit: 20000, quantity: 1 },
      ],
    };

    const total = calculateTotal(reservationInput);

    const expected =
      2 * DEFAULT_PRICING.EXTRA_PERSON_PRICE +
      1 * DEFAULT_PRICING.POOL_PRICE +
      20000;

    assert.strictEqual(total, expected);
  });

  it("calcula correctamente usando contadores numéricos de invitados y piscina", () => {
    const total = calculateTotal(
      {
        extraPersonsCount: 3,
        poolUsersCount: 2,
        addOns: [{ name: "sala_cafeteria", pricePerUnit: 15000, quantity: 2 }],
      },
      {
        extraPersonPrice: 6000,
        poolPrice: 4000,
      }
    );

    // 3 extra * 6000 = 18000
    // 2 pool * 4000 = 8000
    // 2 * 15000 = 30000
    // Total = 56000
    assert.strictEqual(total, 56000);
  });

  it("soporta espacios definidos como diccionario o mapa en config.spaces", () => {
    const total = calculateTotal(
      {
        extraPersons: [{ usesPool: false }],
        addOns: [{ addOnSpaceId: "quincho" }],
      },
      {
        extraPersonPrice: 5000,
        poolPrice: 3000,
        spaces: {
          quincho: 18000,
        },
      }
    );

    // 5000 + 18000 = 23000
    assert.strictEqual(total, 23000);
  });
});
