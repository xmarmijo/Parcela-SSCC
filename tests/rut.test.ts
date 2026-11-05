import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeRut, isValidRut } from "../src/lib/rut";

test("normalizeRut elimina puntos y normaliza guion", () => {
  assert.equal(normalizeRut("12.345.678-9"), "12345678-9");
  assert.equal(normalizeRut("123456789"), "12345678-9");
  assert.equal(normalizeRut("12345678-k"), "12345678-K");
});

test("isValidRut valida RUT correcto", () => {
  assert.equal(isValidRut("12.345.678-5"), true);
});

test("isValidRut rechaza RUT invalido", () => {
  assert.equal(isValidRut("12.345.678-9"), false);
});
