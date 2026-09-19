export type Mode = "beginner" | "expert";
export type OfferStatus = "VERIFIED" | "USER_SUBMITTED" | "STALE" | "CONFLICT" | "SOLD_OUT" | "ENDED";

export interface Offer {
  id: string; channel: string; platform: string; version: string; packageType: string;
  productPrice: number; internationalShipping: number | null; domesticShipping: number | null;
  serviceFee: number | null; otherFee: number | null; discount: number;
  estimatedLandedPrice: number | null; stockStatus: string; saleType: string; origin: string;
  shippingTime: string; deadline: string; memberSelectable: boolean; randomRule: string;
  inclusions: string[]; confidence: number; status: OfferStatus; url: string;
}

export interface Album {
  id: string; artist: string; title: string; titleZh: string; releaseDate: string;
  cover: string; accent: string; lowestPrice: number | null; channelCount: number;
  benefitCount: number; deadline: string; change: number; offers: Offer[];
}
