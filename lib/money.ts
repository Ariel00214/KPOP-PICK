export function formatMoney(value:number|null,currency="CNY"){
 if(value===null)return "待确定";
 try{return new Intl.NumberFormat("zh-CN",{style:"currency",currency,maximumFractionDigits:currency==="KRW"?0:2}).format(value)}catch{return `${currency} ${value}`}
}
