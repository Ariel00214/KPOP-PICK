export const allowedEvents = ["app_open","mode_selected","interest_selected","search_performed","album_viewed","offer_viewed","offer_filtered","photocard_viewed","ai_recommendation_started","ai_recommendation_completed","purchase_link_clicked","submission_started","submission_completed","favorite_added","mode_switched"] as const;
export type EventName = typeof allowedEvents[number];

export function safeProperties(input: unknown) {
  if (!input || typeof input !== "object") return {};
  const blocked = new Set(["name","phone","address","idCard","message"]);
  return Object.fromEntries(Object.entries(input as Record<string,unknown>).filter(([k])=>!blocked.has(k)));
}
