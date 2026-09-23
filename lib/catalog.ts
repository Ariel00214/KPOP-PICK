import {prisma} from "./prisma";
import {albums as fallback} from "./data";
import type {Album,OfferStatus} from "./types";
import {normalizeAlias} from "./artist-alias";

function jsonList(value:string){
 try{const out=JSON.parse(value);return Array.isArray(out)?out.map(String):[]}
 catch{return []}
}
function freshness(album:Album):Album{return{...album,offers:album.offers.map(offer=>offer.status==="VERIFIED"&&Date.now()-new Date(offer.lastVerifiedAt).getTime()>72*60*60_000?{...offer,status:"STALE"}:{...offer})}}

export async function getAlbums(q="",strict=false):Promise<Album[]>{
 try{
  const normalized=normalizeAlias(q);
  const rows=await prisma.album.findMany({
   where:{isDemo:false,...(q?{OR:[{title:{contains:q,mode:"insensitive"}},{group:{name:{contains:q,mode:"insensitive"}}},{artist:{name:{contains:q,mode:"insensitive"}}},{artist:{aliases:{some:{normalizedAlias:normalized}}}}]}:{})},
   include:{group:true,artist:true,versions:{include:{offers:{include:{channel:true,source:true}}}},photocards:true},
   orderBy:{releaseDate:"desc"},
  });
  if(!rows.length)return [];
  const result=rows.map(row=>{
   const offers=row.versions.flatMap(version=>version.offers.filter(offer=>!["PENDING_EXCEPTION","IGNORED"].includes(offer.status)).map(offer=>({
    id:offer.id,channel:offer.channel.name,platform:offer.channel.platform,version:version.name,packageType:version.packageType,
    productPrice:offer.productPrice,internationalShipping:offer.internationalShipping,domesticShipping:offer.domesticShipping,
    serviceFee:offer.serviceFee,otherFee:offer.otherFee,discount:offer.discount,estimatedLandedPrice:offer.estimatedLandedPrice,
    currency:offer.currency,stockStatus:offer.stockStatus,saleType:offer.saleType,origin:offer.shippingOrigin,
    shippingTime:offer.estimatedShippingTime||"待渠道确认",deadline:offer.deadline?.toISOString()||"",
    memberSelectable:offer.memberSelectable,randomRule:offer.randomRule||"以官方详情为准",inclusions:jsonList(offer.inclusions),
    confidence:offer.confidence,status:(offer.status==="VERIFIED"&&Date.now()-(offer.lastVerifiedAt?.getTime()||0)>72*60*60_000?"STALE":offer.status) as OfferStatus,url:offer.purchaseUrl||offer.source.url||"",
    sourceName:offer.source.name,lastVerifiedAt:offer.lastVerifiedAt?.toISOString()||offer.updatedAt.toISOString(),fanbarPrice:offer.fanbarPrice,platformPrice:offer.platformPrice,offerSource:offer.offerSource,purchasePlatform:offer.purchasePlatform,platformProductUrl:offer.platformProductUrl,
   })));
   const active=offers.filter(o=>o.status==="VERIFIED"&&(!o.deadline||new Date(o.deadline).getTime()>=Date.now())&&o.productPrice>0);const prices=active.map(o=>o.productPrice);
   return {id:row.id,artist:row.group?.name||row.artist?.name||"Unknown",title:row.title,titleZh:"",releaseDate:row.releaseDate.toISOString().slice(0,10),cover:"",coverImageUrl:row.coverImageUrl,accent:row.coverColor,lowestPrice:prices.length?Math.min(...prices):null,channelCount:new Set(active.map(o=>o.channel)).size,benefitCount:Math.max(0,...active.map(o=>o.inclusions.length)),deadline:"",change:0,isDemo:row.isDemo,sourceName:row.sourceName,sourceUrl:row.sourceUrl,sourceUpdatedAt:row.sourceUpdatedAt?.toISOString()||null,offers};
  });
  return result.sort((a,b)=>Number(b.lowestPrice!==null)-Number(a.lowestPrice!==null)||new Date(b.releaseDate).getTime()-new Date(a.releaseDate).getTime());
 }catch(error){if(strict)throw error;return fallback.filter(a=>`${a.artist} ${a.title}`.toLowerCase().includes(q.toLowerCase())).map(freshness)}
}
export async function getAlbum(id:string){return (await getAlbums()).find(a=>a.id===id)}
