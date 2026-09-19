type Entry<T> = { value:T; expires:number };
class MemoryCache {
  private values = new Map<string, Entry<unknown>>();
  hits = 0; misses = 0;
  get<T>(key:string):T|undefined { const e=this.values.get(key); if(!e||e.expires<Date.now()){this.values.delete(key);this.misses++;return undefined;} this.hits++; return e.value as T; }
  set<T>(key:string,value:T,ttlMs:number){ this.values.set(key,{value,expires:Date.now()+ttlMs}); }
  invalidate(prefix:string){ for(const key of this.values.keys()) if(key.startsWith(prefix)) this.values.delete(key); }
  stats(){ return {hits:this.hits,misses:this.misses,hitRate:this.hits+this.misses ? this.hits/(this.hits+this.misses):0}; }
}
export const cache = new MemoryCache();
