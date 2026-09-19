import type {Album} from "./types";

// Values below were confirmed on the linked official product pages. The API
// prefers database records and uses this small catalog only during DB recovery.
export const albums:Album[]=[
 {id:"enhypen-desire-unleash-make",artist:"ENHYPEN",title:"DESIRE : UNLEASH (MAKE Ver.) (Weverse Exclusive)",titleZh:"",releaseDate:"2025-06-06",cover:"EN",accent:"#cce8dd",lowestPrice:28.9,channelCount:1,benefitCount:0,deadline:"",change:0,isDemo:false,offers:[{
  id:"weverse-41245",channel:"Weverse Shop",platform:"官方商城",version:"MAKE Ver. (Weverse Exclusive)",packageType:"CD",productPrice:28.9,internationalShipping:null,domesticShipping:null,serviceFee:null,otherFee:null,discount:0,estimatedLandedPrice:null,currency:"USD",stockStatus:"页面可购买",saleType:"在售",origin:"韩国",shippingTime:"登录渠道后确认",deadline:"",memberSelectable:false,randomRule:"以官方商品详情为准",inclusions:[],confidence:1,status:"VERIFIED",url:"https://shop.weverse.io/es/shop/USD/artists/10/sales/41245",sourceName:"Weverse Shop 官方商品页",lastVerifiedAt:"2026-09-19T00:00:00.000Z"
 }]},
 {id:"babymonster-we-go-up-keyring",artist:"BABYMONSTER",title:"BABYMONSTER 2nd MINI ALBUM [WE GO UP] MINI BEAM KEYRING Ver.",titleZh:"",releaseDate:"2025-10-10",cover:"BM",accent:"#ffd5c8",lowestPrice:null,channelCount:1,benefitCount:3,deadline:"",change:0,isDemo:false,offers:[{
  id:"weverse-45542",channel:"Weverse Shop",platform:"官方商城",version:"MINI BEAM KEYRING Ver.",packageType:"QR card",productPrice:32364,internationalShipping:null,domesticShipping:null,serviceFee:null,otherFee:null,discount:0,estimatedLandedPrice:null,currency:"KRW",stockStatus:"售罄",saleType:"已售罄",origin:"韩国",shippingTime:"不可购买",deadline:"",memberSelectable:false,randomRule:"随机内容按官方说明等概率提供",inclusions:["MINI BEAM KEYRING ×1","SELFIE PHOTOCARDS ×6","LOGO STICKERS ×2"],confidence:1,status:"SOLD_OUT",url:"https://shop.weverse.io/zh-tw/shop/KRW/artists/172/sales/45542",sourceName:"Weverse Shop 官方商品页",lastVerifiedAt:"2026-09-19T00:00:00.000Z"
 }]}
];

export const photocards:Array<{id:string;member:string;album:string;type:string;initials:string;color:string;random:boolean}>=[];
export const interests=["ENHYPEN","BABYMONSTER","BLACKPINK","aespa","IVE","SEVENTEEN","BTS","LE SSERAFIM","Stray Kids","TWICE","NCT"];
