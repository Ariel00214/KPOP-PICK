import{prisma}from"./prisma";
export interface StoredEvent{anonymousUserId:string;sessionId:string;eventName:string;properties:Record<string,unknown>;createdAt:Date}
export const analyticsStore:StoredEvent[]=[];
export function pushEvent(event:StoredEvent){analyticsStore.push(event);if(analyticsStore.length>10_000)analyticsStore.shift()}
export function recordServerEvent(eventName:string,properties:Record<string,unknown>={}){pushEvent({anonymousUserId:"server",sessionId:"server",eventName,properties,createdAt:new Date()});void prisma.analyticsEvent.create({data:{anonymousUserId:"server",sessionId:"server",eventName,properties:JSON.stringify(properties)}}).catch(()=>{})}
export function summarize(){const unique=new Set(analyticsStore.map(e=>e.anonymousUserId)).size;const counts=analyticsStore.reduce<Record<string,number>>((a,e)=>(a[e.eventName]=(a[e.eventName]||0)+1,a),{});const searches=counts.search_performed||0;return{uniqueUsers:unique,totalEvents:analyticsStore.length,counts,zeroResultRate:searches?(counts.search_zero_result||0)/searches:0,retention:{d1:null,d7:null,d30:null}}}
