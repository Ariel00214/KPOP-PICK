import type { Album } from "./types";

const offer = (id:string, channel:string, version:string, price:number, extra:Partial<Album["offers"][number]> = {}): Album["offers"][number] => ({
  id, channel, platform: channel.includes("吧") ? "粉丝站" : "电商平台", version, packageType:"写真书版 · Photobook",
  productPrice: price, internationalShipping: 0, domesticShipping: 8, serviceFee: 3, otherFee: 0, discount: 0,
  estimatedLandedPrice: price + 11, stockStatus:"预售", saleType:"预售", origin:"国内", shippingTime:"发行后 2–4 周",
  deadline:"2026-10-05", memberSelectable:false, randomRule:"成员随机", inclusions:["专辑内随机卡 ×2", "预购特典卡 ×1"],
  confidence:.92, status:"VERIFIED", url:"https://example.com/demo", ...extra
});

export const albums: Album[] = [
  { id:"bp-deadline", artist:"BLACKPINK", title:"DEADLINE", titleZh:"DEADLINE", releaseDate:"2026-10-12", cover:"BP", accent:"#ffb8cf", lowestPrice:79, channelCount:6, benefitCount:8, deadline:"10/05", change:-20, offers:[
    offer("o1","YG SELECT","BLACK 版",68,{internationalShipping:null,estimatedLandedPrice:null,origin:"韩国",inclusions:["专辑内随机卡 ×2","YG 预购特典卡 ×1"]}),
    offer("o2","粉墨联合吧","PINK 版",79,{domesticShipping:0,serviceFee:0,estimatedLandedPrice:79,memberSelectable:true,randomRule:"可指定成员",inclusions:["专辑内随机卡 ×2","Jennie 大吧特典卡 ×1"]}),
    offer("o3","Ktown4u","SET 套装",158,{estimatedLandedPrice:182,inclusions:["专辑 ×2","专辑内随机卡 ×4","店铺特典卡 ×2"]})
  ]},
  { id:"aespa-richman", artist:"aespa", title:"Rich Man", titleZh:"富有之人", releaseDate:"2026-09-28", cover:"ae", accent:"#bfe6ff", lowestPrice:72, channelCount:4, benefitCount:5, deadline:"09/25", change:-8, offers:[
    offer("o4","SMTOWN &STORE","Photobook 版",61,{estimatedLandedPrice:86,origin:"韩国"}), offer("o5","宁艺卓吧","成员单封版",72,{memberSelectable:true,estimatedLandedPrice:72,serviceFee:0,domesticShipping:0})
  ]},
  { id:"ive-rebel", artist:"IVE", title:"REBEL HEART", titleZh:"叛逆之心", releaseDate:"2026-10-18", cover:"IVE", accent:"#d9c7ff", lowestPrice:69, channelCount:3, benefitCount:4, deadline:"10/10", change:-12, offers:[offer("o6","Starship Square","LOVED 版",58,{estimatedLandedPrice:81,origin:"韩国"}),offer("o7","张员瑛吧","成员单封版",69,{estimatedLandedPrice:69,memberSelectable:true,domesticShipping:0,serviceFee:0})]},
  { id:"svt-happy", artist:"SEVENTEEN", title:"HAPPY BURSTDAY", titleZh:"快乐爆发日", releaseDate:"2026-11-02", cover:"SVT", accent:"#dcf7cf", lowestPrice:76, channelCount:2, benefitCount:3, deadline:"10/25", change:-5, offers:[offer("o8","Weverse Shop","标准版",65,{estimatedLandedPrice:null,internationalShipping:null,origin:"韩国"}),offer("o9","次粉集运","标准版",76,{estimatedLandedPrice:76,domesticShipping:0,serviceFee:0})]},
  { id:"nj-supernatural", artist:"NewJeans", title:"Supernatural", titleZh:"超自然", releaseDate:"2026-09-30", cover:"NJ", accent:"#ffe9a7", lowestPrice:66, channelCount:3, benefitCount:4, deadline:"09/27", change:-6, offers:[offer("o10","Weverse Shop","Drawstring Bag 版",55,{estimatedLandedPrice:83,origin:"韩国"}),offer("o11","鲸鱼商店","成员版",66,{estimatedLandedPrice:66,memberSelectable:true,domesticShipping:0,serviceFee:0})]}
];

export const photocards = [
  ["Jennie","DEADLINE","YG 预购特典","BP","#ffb8cf"],["Rosé","DEADLINE","店铺特典","RS","#ffd9e4"],["Karina","Rich Man","Lucky Draw","KR","#bfe6ff"],["Ningning","Rich Man","专辑内随机卡","NN","#cfeeff"],["Wonyoung","REBEL HEART","店铺特典","WY","#d9c7ff"],["Mingyu","HAPPY BURSTDAY","预购特典","MG","#dcf7cf"],["Hanni","Supernatural","专辑内随机卡","HN","#ffe9a7"],["Danielle","Supernatural","店铺特典","DN","#fff0bf"]
].map((x,i)=>({id:`pc${i+1}`,member:x[0],album:x[1],type:x[2],initials:x[3],color:x[4],random:i%3!==0}));

export const interests = ["BLACKPINK","aespa","IVE","SEVENTEEN","NewJeans","BTS","LE SSERAFIM","Stray Kids","TWICE","NCT","Jennie","Karina"];
