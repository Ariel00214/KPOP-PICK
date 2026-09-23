export type Mode = "beginner" | "expert";
export type OfferStatus = "VERIFIED" | "USER_SUBMITTED" | "PENDING_EXCEPTION" | "IGNORED" | "STALE" | "CONFLICT" | "SOLD_OUT" | "ENDED";

export interface Offer {
  id: string; channel: string; platform: string; version: string; packageType: string;
  productPrice: number; internationalShipping: number | null; domesticShipping: number | null;
  serviceFee: number | null; otherFee: number | null; discount: number;
  estimatedLandedPrice: number | null; stockStatus: string; saleType: string; origin: string;
  shippingTime: string; deadline: string; memberSelectable: boolean; randomRule: string;
  inclusions: string[]; confidence: number; status: OfferStatus; url: string; currency: string;
  sourceName: string; lastVerifiedAt: string;
  fanbarPrice?:number|null;platformPrice?:number|null;offerSource?:string|null;purchasePlatform?:string|null;platformProductUrl?:string|null;
}

export interface Album {
  id: string; artist: string; title: string; titleZh: string; releaseDate: string;
  cover: string; coverImageUrl: string | null; accent: string; lowestPrice: number | null; channelCount: number;
  benefitCount: number; deadline: string; change: number; offers: Offer[]; isDemo: boolean;
  sourceName?: string | null; sourceUrl?: string | null; sourceUpdatedAt?: string | null;
}
