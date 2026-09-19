export interface StoredEvent{anonymousUserId:string;sessionId:string;eventName:string;properties:Record<string,unknown>;createdAt:Date}
export const analyticsStore:StoredEvent[]=[];
export function pushEvent(event:StoredEvent){analyticsStore.push(event);if(analyticsStore.length>10_000)analyticsStore.shift()}
export function summarize(){const unique=new Set(analyticsStore.map(e=>e.anonymousUserId)).size;const counts=analyticsStore.reduce<Record<string,number>>((a,e)=>(a[e.eventName]=(a[e.eventName]||0)+1,a),{});return{uniqueUsers:unique,totalEvents:analyticsStore.length,counts,retention:{d1:null,d7:null,d30:null}}}
