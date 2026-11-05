// Normalización y validación de RUT chileno
export function normalizeRut(input: string): string {
  if (!input) return "";
  let cleaned = input.replace(/\./g, "").replace(/\s/g, "").toUpperCase();
  // separar cuerpo y dígito verificador
  if (cleaned.includes("-")) {
    const [body, dv] = cleaned.split("-");
    cleaned = body + (dv ?? "");
  }
  if (cleaned.length < 2) return cleaned;
  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);
  return `${body}-${dv}`;
}

export function isValidRut(input: string): boolean {
  const rut = normalizeRut(input);
  if (!/^\d{7,8}-[\dK]$/.test(rut)) return false;
  const [body, dv] = rut.split("-");
  let sum = 0;
  let factor = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const expected = 11 - (sum % 11);
  const expectedDv =
    expected === 11 ? "0" : expected === 10 ? "K" : String(expected);
  return expectedDv === dv;
}
