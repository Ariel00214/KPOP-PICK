const windows=new Map<string,{count:number;until:number}>();
export function permitRequest(key:string,limit=20){const now=Date.now();for(const[k,v]of windows)if(v.until<now)windows.delete(k);if(windows.size>10000)return false;const value=windows.get(key)||{count:0,until:now+60000};value.count++;windows.set(key,value);return value.count<=limit}
