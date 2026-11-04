import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

export function getMercadoPagoConfig(): MercadoPagoConfig {
  const accessToken =
    process.env.MERCADOPAGO_ACCESS_TOKEN || "TEST-ACCESS-TOKEN";
  return new MercadoPagoConfig({ accessToken });
}

export function getPreferenceClient(): Preference {
  if ((globalThis as any).__mockMercadoPagoPreference) {
    return (globalThis as any).__mockMercadoPagoPreference;
  }
  return new Preference(getMercadoPagoConfig());
}

export function getPaymentClient(): Payment {
  if ((globalThis as any).__mockMercadoPagoPayment) {
    return (globalThis as any).__mockMercadoPagoPayment;
  }
  return new Payment(getMercadoPagoConfig());
}
