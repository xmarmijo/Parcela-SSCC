/**
 * src/lib/pricing.ts
 * Pure function and defaults for calculating reservation totals.
 */

export const DEFAULT_PRICING = {
  BASE_PRICE: 0,
  EXTRA_PERSON_PRICE: 2000,
  POOL_PRICE: 4000,
} as const;

export interface ExtraPersonInput {
  fullName?: string;
  rut?: string | null;
  isSocio?: boolean;
  usesPool?: boolean;
}

export interface ReservationAddOnInput {
  addOnSpaceId?: string;
  name?: string;
  quantity?: number;
  pricePerUnit?: number;
}

export interface AddOnSpacePrice {
  id?: string;
  name?: string;
  pricePerUnit: number;
}

export interface PricingConfig {
  basePrice?: number;
  extraPersonPrice?: number;
  poolPrice?: number;
  addOnSpaces?: AddOnSpacePrice[];
  spaces?: Record<string, number> | AddOnSpacePrice[];
}

export interface ReservationPricingInput {
  extraPersons?: ExtraPersonInput[];
  addOns?: ReservationAddOnInput[];
  extraPersonsCount?: number;
  poolUsersCount?: number;
  prices?: PricingConfig;
}

/**
 * Pure function that calculates the total amount for a reservation in CLP.
 *
 * @param reservation Input reservation with extra persons and add-ons
 * @param config Optional price configuration overriding defaults or supplying AddOnSpace prices
 * @returns Total reservation price in CLP
 */
export function calculateTotal(
  reservation: ReservationPricingInput,
  config?: PricingConfig
): number {
  const activeConfig = config ?? reservation.prices ?? {};

  const basePrice =
    typeof activeConfig.basePrice === "number"
      ? activeConfig.basePrice
      : DEFAULT_PRICING.BASE_PRICE;

  const extraPersonRate =
    typeof activeConfig.extraPersonPrice === "number"
      ? activeConfig.extraPersonPrice
      : DEFAULT_PRICING.EXTRA_PERSON_PRICE;

  const poolRate =
    typeof activeConfig.poolPrice === "number"
      ? activeConfig.poolPrice
      : DEFAULT_PRICING.POOL_PRICE;

  let extraPersonsTotal = 0;

  if (Array.isArray(reservation.extraPersons)) {
    for (const person of reservation.extraPersons) {
      if (person.isSocio) {
        // Socios no pagan entrada (ni piscina) como invitados extra
        continue;
      }
      extraPersonsTotal += extraPersonRate;
      if (person.usesPool) {
        extraPersonsTotal += poolRate;
      }
    }
  } else {
    const extraCount = reservation.extraPersonsCount ?? 0;
    const poolCount = reservation.poolUsersCount ?? 0;
    extraPersonsTotal = extraCount * extraPersonRate + poolCount * poolRate;
  }

  // Resolve space prices list
  let spacesList: AddOnSpacePrice[] = [];
  if (Array.isArray(activeConfig.addOnSpaces)) {
    spacesList = activeConfig.addOnSpaces;
  } else if (Array.isArray(activeConfig.spaces)) {
    spacesList = activeConfig.spaces;
  }

  const spacesMap: Record<string, number> = {};
  if (
    activeConfig.spaces &&
    !Array.isArray(activeConfig.spaces) &&
    typeof activeConfig.spaces === "object"
  ) {
    for (const [key, value] of Object.entries(activeConfig.spaces)) {
      spacesMap[key.toLowerCase()] = Number(value);
    }
  }

  let addOnsTotal = 0;

  if (Array.isArray(reservation.addOns)) {
    for (const addOn of reservation.addOns) {
      const quantity =
        typeof addOn.quantity === "number" && addOn.quantity > 0
          ? addOn.quantity
          : 1;

      let unitPrice = 0;

      // 1. Direct price on item
      if (typeof addOn.pricePerUnit === "number") {
        unitPrice = addOn.pricePerUnit;
      }
      // 2. Check by spacesMap record
      else if (
        addOn.name &&
        typeof spacesMap[addOn.name.toLowerCase()] === "number"
      ) {
        unitPrice = spacesMap[addOn.name.toLowerCase()];
      } else if (
        addOn.addOnSpaceId &&
        typeof spacesMap[addOn.addOnSpaceId.toLowerCase()] === "number"
      ) {
        unitPrice = spacesMap[addOn.addOnSpaceId.toLowerCase()];
      }
      // 3. Check spacesList array
      else {
        const found = spacesList.find((space) => {
          if (addOn.addOnSpaceId && space.id === addOn.addOnSpaceId) {
            return true;
          }
          if (
            addOn.addOnSpaceId &&
            space.name &&
            space.name.toLowerCase() === addOn.addOnSpaceId.toLowerCase()
          ) {
            return true;
          }
          if (
            addOn.name &&
            space.name &&
            space.name.toLowerCase() === addOn.name.toLowerCase()
          ) {
            return true;
          }
          return false;
        });

        if (found) {
          unitPrice = found.pricePerUnit;
        }
      }

      addOnsTotal += unitPrice * quantity;
    }
  }

  return basePrice + extraPersonsTotal + addOnsTotal;
}
