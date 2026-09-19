import {prisma} from "./prisma";
import {albums as fallback} from "./data";
import type {Album,OfferStatus} from "./types";

function jsonList(value:string){
 try{const out=JSON.parse(value);return Array.isArray(out)?out.map(String):[]}
 catch{return []}
}
function freshness(album:Album):Album{return{...album,offers:album.offers.map(offer=>offer.status==="VERIFIED"&&Date.now()-new Date(offer.lastVerifiedAt).getTime()>72*60*60_000?{...offer,status:"STALE"}:{...offer})}}

export async function getAlbums(q=""):Promise<Album[]>{
 try{
  const rows=await prisma.album.findMany({
   where:{isDemo:false,...(q?{OR:[{title:{contains:q}},{group:{name:{contains:q}}},{artist:{name:{contains:q}}}]}:{})},
   include:{group:true,artist:true,versions:{include:{offers:{include:{channel:true,source:true}}}},photocards:true},
   orderBy:{releaseDate:"desc"},
  });
  if(!rows.length)return fallback.filter(a=>`${a.artist} ${a.title}`.toLowerCase().includes(q.toLowerCase())).map(freshness);
  return rows.map(row=>{
   const offers=row.versions.flatMap(version=>version.offers.map(offer=>({
    id:offer.id,channel:offer.channel.name,platform:offer.channel.platform,version:version.name,packageType:version.packageType,
    productPrice:offer.productPrice,internationalShipping:offer.internationalShipping,domesticShipping:offer.domesticShipping,
    serviceFee:offer.serviceFee,otherFee:offer.otherFee,discount:offer.discount,estimatedLandedPrice:offer.estimatedLandedPrice,
    currency:offer.currency,stockStatus:offer.stockStatus,saleType:offer.saleType,origin:offer.shippingOrigin,
    shippingTime:offer.estimatedShippingTime||"待渠道确认",deadline:offer.deadline?.toISOString()||"",
    memberSelectable:offer.memberSelectable,randomRule:offer.randomRule||"以官方详情为准",inclusions:jsonList(offer.inclusions),
    confidence:offer.confidence,status:(offer.status==="VERIFIED"&&Date.now()-(offer.lastVerifiedAt?.getTime()||0)>72*60*60_000?"STALE":offer.status) as OfferStatus,url:offer.purchaseUrl||offer.source.url||"",
    sourceName:offer.source.name,lastVerifiedAt:offer.lastVerifiedAt?.toISOString()||offer.updatedAt.toISOString(),
   })));
   const prices=offers.filter(o=>o.status!=="SOLD_OUT"&&o.status!=="ENDED").map(o=>o.productPrice);
   return {id:row.id,artist:row.group?.name||row.artist?.name||"Unknown",title:row.title,titleZh:"",releaseDate:row.releaseDate.toISOString().slice(0,10),cover:(row.group?.name||row.artist?.name||"?").slice(0,2).toUpperCase(),accent:row.coverColor,lowestPrice:prices.length?Math.min(...prices):null,channelCount:new Set(offers.map(o=>o.channel)).size,benefitCount:Math.max(0,...offers.map(o=>o.inclusions.length)),deadline:"",change:0,isDemo:row.isDemo,offers};
  });
 }catch{return fallback.filter(a=>`${a.artist} ${a.title}`.toLowerCase().includes(q.toLowerCase())).map(freshness)}
}
export async function getAlbum(id:string){return (await getAlbums()).find(a=>a.id===id)}
