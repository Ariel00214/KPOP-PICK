import type { Offer } from "./types";

export function calculateLandedPrice(offer: Pick<Offer,"productPrice"|"internationalShipping"|"domesticShipping"|"serviceFee"|"otherFee"|"discount">) {
  const fees = [offer.internationalShipping, offer.domesticShipping, offer.serviceFee, offer.otherFee];
  if (fees.some((fee) => fee === null)) return null;
  return offer.productPrice + fees.reduce<number>((sum, fee) => sum + (fee ?? 0), 0) - offer.discount;
}

export function recommendOffers(offers: Offer[], budget: number, avoidRandom: boolean, priority: "price"|"speed") {
  return offers.filter(o => o.status !== "SOLD_OUT" && o.status !== "ENDED")
    .filter(o => o.estimatedLandedPrice === null || o.estimatedLandedPrice <= budget)
    .filter(o => !avoidRandom || o.memberSelectable)
    .sort((a,b) => priority === "price" ? (a.estimatedLandedPrice ?? 1e9)-(b.estimatedLandedPrice ?? 1e9) : a.shippingTime.localeCompare(b.shippingTime))
    .slice(0,3);
}
