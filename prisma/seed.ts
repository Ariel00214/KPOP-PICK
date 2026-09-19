import{PrismaClient,OfferStatus}from"@prisma/client";
const db=new PrismaClient();
async function main(){
 await db.priceHistory.deleteMany();await db.purchaseOffer.deleteMany();await db.photocard.deleteMany();await db.albumVersion.deleteMany();await db.favorite.deleteMany();await db.album.deleteMany();await db.member.deleteMany();await db.group.deleteMany();await db.artist.deleteMany();await db.channel.deleteMany();await db.source.deleteMany();
 const source=await db.source.create({data:{name:"KPOP PICK DEMO",type:"DEMO"}});
 const channels=await Promise.all(["YG SELECT","Ktown4u","Weverse Shop","SMTOWN &STORE","粉丝联合吧"].map((name,i)=>db.channel.create({data:{name,platform:i===4?"粉丝站":"官方/电商",region:i<4?"韩国":"中国"}})));
 const groups=await Promise.all([["BLACKPINK","粉墨","#ffb8cf"],["aespa","aespa","#bfe6ff"],["IVE","IVE","#d9c7ff"]].map(([name,nameZh,color])=>db.group.create({data:{name,nameZh,color}})));
 const memberNames=[["Jennie","Jisoo","Rosé","Lisa"],["Karina","Winter","Giselle","Ningning"],["Wonyoung","Yujin"]];const members=[];
 for(let i=0;i<groups.length;i++)for(const name of memberNames[i])members.push(await db.member.create({data:{name,groupId:groups[i].id}}));
 const specs=[["bp-deadline","DEADLINE",0],["aespa-richman","Rich Man",1],["ive-rebel","REBEL HEART",2],["bp-bornpink","BORN PINK",0],["aespa-armageddon","Armageddon",1]] as const;let offerNo=0,cardNo=0;
 for(const[id,title,gi]of specs){
  const album=await db.album.create({data:{id,title,titleZh:title,releaseDate:new Date("2026-10-01"),coverColor:groups[gi].color,groupId:groups[gi].id,isDemo:true}});
  for(const vname of["写真书版","成员单封版"]){const version=await db.albumVersion.create({data:{albumId:album.id,name:vname,packageType:vname,memberVersion:vname.includes("成员")?"可选/随机待确认":null}});for(let j=0;j<2&&offerNo<15;j++){const productPrice=60+offerNo*3;await db.purchaseOffer.create({data:{albumVersionId:version.id,channelId:channels[offerNo%channels.length].id,productPrice,internationalShipping:offerNo%4===0?null:12,domesticShipping:8,serviceFee:3,otherFee:0,discount:0,estimatedLandedPrice:offerNo%4===0?null:productPrice+23,stockStatus:"预售",saleType:"预售",shippingOrigin:offerNo%2?"中国":"韩国",estimatedShippingTime:"发行后 2–4 周",deadline:new Date("2026-10-05"),memberSelectable:vname.includes("成员"),randomRule:vname.includes("成员")?"可指定成员":"成员随机",inclusions:JSON.stringify(["专辑内随机卡 ×2","预购特典卡 ×1"]),sourceId:source.id,confidence:.9,status:OfferStatus.VERIFIED,purchaseUrl:"https://example.com/demo"}});offerNo++}}
  for(let p=0;p<4;p++)await db.photocard.create({data:{albumId:album.id,memberId:members[(cardNo+p)%members.length].id,type:p%2?"店铺特典卡":"专辑内随机卡",name:`DEMO 小卡 ${cardNo+p+1}`,isRandom:p%3!==0}});cardNo+=4;
 }
 console.log(`Seeded DEMO: ${groups.length} groups, ${members.length} members, ${specs.length} albums, ${offerNo} offers, ${cardNo} photocards.`)
}
main().finally(()=>db.$disconnect());
