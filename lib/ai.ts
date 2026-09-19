import { albums, interests, photocards } from "./data";
import { recommendOffers } from "./pricing";
import type { Offer } from "./types";

export type Priority = "price" | "speed" | "benefits";

export interface PurchaseIntent {
  artist: string | null;
  album: string | null;
  member: string | null;
  budget: number | null;
  avoidRandom: boolean;
  domesticOnly: boolean;
  priority: Priority;
  version: string | null;
}

export interface RecommendationPlan {
  albumId: string;
  albumTitle: string;
  artist: string;
  offer: Offer;
  reason: string;
}

export interface TextRecommendation {
  understood: PurchaseIntent;
  summary: string;
  plans: RecommendationPlan[];
  provider: "llm" | "rules-fallback";
}

export interface AIProvider {
  recommend(input:{budget:number;avoidRandom:boolean;priority:"price"|"speed"}):Promise<Offer[]>;
  recommendFromText(input:string):Promise<TextRecommendation>;
  extract(input:string):Promise<Record<string,unknown>>;
}

const allMembers = Array.from(new Set([
  ...photocards.map(card => card.member),
  ...interests.filter(item => !albums.some(album => album.artist === item)),
]));

const includesAny = (value:string, words:string[]) => words.some(word => value.includes(word));

export function parsePurchaseIntent(input:string):PurchaseIntent {
  const normalized = input.trim();
  const lower = normalized.toLowerCase();
  const album = albums.find(item =>
    lower.includes(item.title.toLowerCase()) ||
    (item.titleZh.length>0&&lower.includes(item.titleZh.toLowerCase())) ||
    lower.includes(item.artist.toLowerCase())
  );
  const member = allMembers.find(item => lower.includes(item.toLowerCase())) ?? null;
  const range = normalized.match(/(\d+(?:\.\d+)?)\s*(?:元)?\s*(?:到|至|[-~～])\s*(\d+(?:\.\d+)?)\s*元?/);
  const budgetMatch = normalized.match(/(?:预算|最多|不超过|控制在|不高于|以内|低于|少于|大概|大约|¥|￥)\s*(\d+(?:\.\d+)?)\s*元?/);
  const yuanMatch = normalized.match(/(\d+(?:\.\d+)?)\s*元/);
  const budget = Number(range?.[2] ?? budgetMatch?.[1] ?? yuanMatch?.[1] ?? 0) || null;
  const avoidRandom = includesAny(normalized,["不要随机","不接受随机","不能随机","拒绝随机","不想抽","可指定","指定成员","指定小卡"]) || Boolean(member);
  const domesticOnly = includesAny(normalized,["只要国内","国内渠道","国内发货","不要海淘","不想海淘","不走海淘"]);
  const priority:Priority = includesAny(normalized,["小卡多","特典多","赠品多","更看重小卡","小卡优先"])
    ? "benefits"
    : includesAny(normalized,["发货快","尽快","着急","现货","速度优先","快一点"])
      ? "speed"
      : "price";
  const version = ["写真书版","成员单封版","成员版","SET 套装","标准版","Photobook 版"]
    .find(item => lower.includes(item.toLowerCase())) ?? null;

  return {artist:album?.artist ?? null,album:album?.title ?? null,member,budget,avoidRandom,domesticOnly,priority,version};
}

function findAlbumByOffer(offer:Offer) {
  return albums.find(album => album.offers.some(item => item.id === offer.id))!;
}

function reasonFor(offer:Offer,intent:PurchaseIntent) {
  const reasons:string[] = [];
  if (intent.budget && offer.currency==="CNY" && offer.estimatedLandedPrice !== null && offer.estimatedLandedPrice <= intent.budget) reasons.push(`预计到手价在 ¥${intent.budget} 预算内`);
  if (intent.member && offer.memberSelectable) reasons.push(`支持指定成员，更贴合你想要 ${intent.member} 的需求`);
  else if (intent.avoidRandom && offer.memberSelectable) reasons.push("支持指定成员，可降低随机风险");
  if (intent.domesticOnly && offer.origin === "国内") reasons.push("国内渠道，购买流程更直接");
  if (intent.priority === "benefits") reasons.push(`包含 ${offer.inclusions.length} 类专辑/小卡权益`);
  if (intent.priority === "speed") reasons.push(`当前标注发货时间为“${offer.shippingTime}”`);
  if (!reasons.length) reasons.push("在现有已核实数据中综合价格、费用完整度与随机风险后更匹配");
  return reasons.join("；") + "。";
}

export function recommendFromIntent(intent:PurchaseIntent, provider:TextRecommendation["provider"]="rules-fallback"):TextRecommendation {
  let candidates = albums
    .filter(album => !intent.artist || album.artist.toLowerCase() === intent.artist.toLowerCase())
    .filter(album => !intent.album || album.title.toLowerCase() === intent.album.toLowerCase())
    .flatMap(album => album.offers)
    .filter(offer => offer.status !== "SOLD_OUT" && offer.status !== "ENDED")
    .filter(offer => !intent.domesticOnly || offer.origin === "国内")
    .filter(offer => !intent.version || `${offer.version} ${offer.packageType}`.toLowerCase().includes(intent.version.toLowerCase()));

  const memberSafe = candidates.filter(offer => !intent.avoidRandom || offer.memberSelectable);
  if (memberSafe.length) candidates = memberSafe;
  const withinBudget = candidates.filter(offer => !intent.budget || (offer.currency==="CNY"&&offer.estimatedLandedPrice !== null && offer.estimatedLandedPrice <= intent.budget));
  const usedBudgetFallback = Boolean(intent.budget && !withinBudget.length);
  if (withinBudget.length) candidates = withinBudget;

  candidates.sort((a,b) => {
    if (intent.priority === "benefits") return b.inclusions.length - a.inclusions.length || (a.estimatedLandedPrice ?? 1e9) - (b.estimatedLandedPrice ?? 1e9);
    if (intent.priority === "speed") return Number(b.origin === "国内") - Number(a.origin === "国内") || a.shippingTime.localeCompare(b.shippingTime);
    return (a.estimatedLandedPrice ?? 1e9) - (b.estimatedLandedPrice ?? 1e9);
  });

  const plans = candidates.slice(0,3).map(offer => {
    const album = findAlbumByOffer(offer);
    return {albumId:album.id,albumTitle:album.title,artist:album.artist,offer,reason:reasonFor(offer,intent)};
  });
  const target = [intent.artist,intent.album,intent.member].filter(Boolean).join(" · ");
  const summary = plans.length
    ? `${target ? `已按“${target}”筛选。` : "已理解你的购买需求。"}${usedBudgetFallback ? "现有数据中没有完全落在预算内的方案，下面展示最接近的选择，请留意价格。" : `结合${intent.priority === "benefits" ? "小卡与特典数量" : intent.priority === "speed" ? "发货速度" : "到手价"}，建议优先比较以下方案。`}`
    : "现有可靠数据中暂时没有完全匹配的方案。你可以换一种描述，或减少一个限制条件后重试。";
  return {understood:intent,summary,plans,provider};
}

function normalizeLLMIntent(value:unknown, fallback:PurchaseIntent):PurchaseIntent {
  if (!value || typeof value !== "object") return fallback;
  const data = value as Record<string,unknown>;
  const priority:Priority = data.priority === "speed" || data.priority === "benefits" ? data.priority : "price";
  return {
    artist:typeof data.artist === "string" && data.artist ? data.artist : fallback.artist,
    album:typeof data.album === "string" && data.album ? data.album : fallback.album,
    member:typeof data.member === "string" && data.member ? data.member : fallback.member,
    budget:typeof data.budget === "number" && data.budget > 0 ? data.budget : fallback.budget,
    avoidRandom:typeof data.avoidRandom === "boolean" ? data.avoidRandom : fallback.avoidRandom,
    domesticOnly:typeof data.domesticOnly === "boolean" ? data.domesticOnly : fallback.domesticOnly,
    priority,
    version:typeof data.version === "string" && data.version ? data.version : fallback.version,
  };
}

async function analyzeWithLLM(input:string):Promise<PurchaseIntent|null> {
  if (process.env.AI_PROVIDER !== "llm" || !process.env.AI_API_KEY || !process.env.AI_BASE_URL || !process.env.AI_MODEL) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(),8000);
  try {
    const response = await fetch(`${process.env.AI_BASE_URL.replace(/\/$/,"")}/chat/completions`,{
      method:"POST",
      headers:{"content-type":"application/json",authorization:`Bearer ${process.env.AI_API_KEY}`},
      body:JSON.stringify({model:process.env.AI_MODEL,temperature:0,response_format:{type:"json_object"},messages:[
        {role:"system",content:"你负责理解 K-pop 专辑购买需求。只输出 JSON，字段为 artist, album, member, budget, avoidRandom, domesticOnly, priority, version。priority 只能是 price、speed、benefits；无法判断的字符串或数字用 null，布尔值用 false。不要生成价格或商品事实。"},
        {role:"user",content:input},
      ]}),
      signal:controller.signal,
    });
    if (!response.ok) return null;
    const payload = await response.json() as {choices?:Array<{message?:{content?:string}}>};
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return null;
    return normalizeLLMIntent(JSON.parse(content),parsePurchaseIntent(input));
  } catch { return null; }
  finally { clearTimeout(timeout); }
}

export class RulesProvider implements AIProvider {
  async recommend(input:{budget:number;avoidRandom:boolean;priority:"price"|"speed"}) { return recommendOffers(albums.flatMap(a=>a.offers),input.budget,input.avoidRandom,input.priority); }
  async recommendFromText(input:string) {
    const llmIntent = await analyzeWithLLM(input);
    return recommendFromIntent(llmIntent ?? parsePurchaseIntent(input),llmIntent ? "llm" : "rules-fallback");
  }
  async extract(input:string) {
    const price = input.match(/(?:¥|￥)?\s*(\d+(?:\.\d{1,2})?)/)?.[1];
    const album = albums.find(a=>input.toLowerCase().includes(a.title.toLowerCase()));
    return {artist:album?.artist??"待确认",album:album?.title??"待确认",channel:"待确认",price:price?Number(price):null,deadline:"待确认",shipping:"待确认",source:"用户提交",confidence:price?.length?0.62:0.35};
  }
}
export const aiProvider:AIProvider = new RulesProvider();
