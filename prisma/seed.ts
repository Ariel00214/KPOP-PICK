import{PrismaClient,OfferStatus,ArtistAliasType}from"@prisma/client";import{findOfficialAlbumArtwork}from"../lib/artwork";
const db=new PrismaClient();
async function main(){
 const source=await db.source.upsert({where:{id:"source-weverse-official"},update:{url:"https://shop.weverse.io/"},create:{id:"source-weverse-official",name:"Weverse Shop 官方商品页",type:"OFFICIAL_STORE",url:"https://shop.weverse.io/"}});
 const channel=await db.channel.upsert({where:{name:"Weverse Shop"},update:{platform:"官方商城",region:"全球/韩国"},create:{name:"Weverse Shop",platform:"官方商城",region:"全球/韩国"}});
 const entries=[
  {albumId:"enhypen-desire-unleash-make",group:"ENHYPEN",title:"DESIRE : UNLEASH (MAKE Ver.) (Weverse Exclusive)",release:"2025-06-06",color:"#cce8dd",versionId:"version-weverse-41245",version:"MAKE Ver. (Weverse Exclusive)",packageType:"CD",offerId:"weverse-41245",price:28.9,currency:"USD",stock:"页面可购买",saleType:"在售",status:OfferStatus.VERIFIED,url:"https://shop.weverse.io/es/shop/USD/artists/10/sales/41245",inclusions:[]},
  {albumId:"babymonster-we-go-up-keyring",group:"BABYMONSTER",title:"BABYMONSTER 2nd MINI ALBUM [WE GO UP] MINI BEAM KEYRING Ver.",release:"2025-10-10",color:"#ffd5c8",versionId:"version-weverse-45542",version:"MINI BEAM KEYRING Ver.",packageType:"QR card",offerId:"weverse-45542",price:32364,currency:"KRW",stock:"售罄",saleType:"已售罄",status:OfferStatus.SOLD_OUT,url:"https://shop.weverse.io/zh-tw/shop/KRW/artists/172/sales/45542",inclusions:["MINI BEAM KEYRING ×1","SELFIE PHOTOCARDS ×6","LOGO STICKERS ×2"]}
 ] as const;
 for(const item of entries){
  const group=await db.group.upsert({where:{name:item.group},update:{color:item.color},create:{name:item.group,color:item.color}});
  await db.album.upsert({where:{id:item.albumId},update:{title:item.title,titleZh:null,releaseDate:new Date(`${item.release}T00:00:00Z`),coverColor:item.color,isDemo:false,groupId:group.id},create:{id:item.albumId,title:item.title,releaseDate:new Date(`${item.release}T00:00:00Z`),coverColor:item.color,isDemo:false,groupId:group.id}});
  await db.albumVersion.upsert({where:{id:item.versionId},update:{name:item.version,packageType:item.packageType},create:{id:item.versionId,albumId:item.albumId,name:item.version,packageType:item.packageType}});
  const verifiedAt=new Date("2026-09-19T00:00:00Z");
  await db.purchaseOffer.upsert({where:{id:item.offerId},update:{productPrice:item.price,currency:item.currency,stockStatus:item.stock,saleType:item.saleType,purchaseUrl:item.url,status:item.status,lastVerifiedAt:verifiedAt,inclusions:JSON.stringify(item.inclusions)},create:{id:item.offerId,albumVersionId:item.versionId,channelId:channel.id,productPrice:item.price,currency:item.currency,stockStatus:item.stock,saleType:item.saleType,shippingOrigin:"韩国",estimatedShippingTime:item.status===OfferStatus.SOLD_OUT?"不可购买":"登录渠道后确认",memberSelectable:false,randomRule:"以官方商品详情为准",inclusions:JSON.stringify(item.inclusions),purchaseUrl:item.url,sourceId:source.id,confidence:1,status:item.status,lastVerifiedAt:verifiedAt}});
 }
 const yesung=await db.artist.upsert({where:{name:"YESUNG"},update:{},create:{name:"YESUNG",nameZh:"艺声"}});
 const aliases:[string,string,ArtistAliasType][]=[
  ["YESUNG","en",ArtistAliasType.STAGE_NAME],["Yesung","en",ArtistAliasType.COMMON_ALIAS],["예성","ko",ArtistAliasType.KOREAN_NAME],
  ["艺声","zh-CN",ArtistAliasType.CHINESE_NAME],["金钟云","zh-CN",ArtistAliasType.REAL_NAME],["金鐘雲","zh-TW",ArtistAliasType.REAL_NAME],
  ["SUPER JUNIOR YESUNG","en",ArtistAliasType.GROUP_RELATED],["SJ艺声","zh-CN",ArtistAliasType.GROUP_RELATED]
 ];
 for(const[alias,language,aliasType]of aliases)await db.artistAlias.upsert({where:{artistId_normalizedAlias:{artistId:yesung.id,normalizedAlias:alias.normalize("NFKC").toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu,"")}},update:{alias,language,aliasType},create:{artistId:yesung.id,alias,language,aliasType,normalizedAlias:alias.normalize("NFKC").toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu,"")}});
 const missingArtwork=await db.album.findMany({where:{coverImageUrl:null},include:{artist:true,group:true}});
 for(const album of missingArtwork){const artist=album.group?.name||album.artist?.name;if(!artist)continue;const coverImageUrl=await findOfficialAlbumArtwork(artist,album.title);if(coverImageUrl)await db.album.update({where:{id:album.id},data:{coverImageUrl}})}
 console.log(`Catalog ready: ${entries.length} verified official products.`)
}
main().finally(()=>db.$disconnect());
