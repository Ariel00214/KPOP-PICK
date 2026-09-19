const hits=new Map<string,{count:number;reset:number}>();
export function allowRequest(key:string,limit=10,windowMs=10*60_000){
 const now=Date.now();const current=hits.get(key);
 if(!current||current.reset<=now){hits.set(key,{count:1,reset:now+windowMs});return true}
 if(current.count>=limit)return false;
 current.count++;return true;
}
