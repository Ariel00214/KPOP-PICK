import{describe,expect,it,beforeEach}from"vitest";
import{aliasMatches,normalizeAlias}from"@/lib/artist-alias";
import{ReleaseDiscoveryService,type DiscoveryRepository,type DiscoveredRelease,type ReleaseSourceProvider,type StoredCandidate}from"@/lib/release-discovery";
import{cache,invalidateCatalogCaches}from"@/lib/cache";

const fixture:DiscoveredRelease={artistName:"YESUNG",artistAliases:["Yesung","예성","艺声","金钟云","金鐘雲","SUPER JUNIOR YESUNG","SJ艺声"],albumName:"Where We Are",releaseDate:"2026-10-06",releaseType:"ALBUM",sourceUrl:"https://source.example/where-we-are",sourceName:"Official A",sourcePublishedAt:"2026-09-18T00:00:00Z",confidence:.98,preorderStarted:true};
class Provider implements ReleaseSourceProvider{constructor(public name:string,private rows:DiscoveredRelease[],public trusted=true){}async discover(){return this.rows.map(row=>({...row,sourceName:this.name,sourceUrl:`https://${this.name.replaceAll(" ", "-").toLowerCase()}.example/release`}))}}
class Repo implements DiscoveryRepository{
 albums=new Map<string,{id:string}>();candidates:StoredCandidate[]=[];verified=0;
 async findAlbum(aliases:string[],albumName:string){return this.albums.get(`${normalizeAlias(aliases[0])}:${normalizeAlias(albumName)}`)||null}
 async saveCandidate(release:DiscoveredRelease,status:StoredCandidate["status"],evidence:DiscoveredRelease[],conflictReason?:string){const candidate={...release,id:`candidate-${this.candidates.length+1}`,status,conflictReason,evidence};this.candidates.push(candidate);return candidate}
 async verifyCandidate(candidate:StoredCandidate){const albumId="yesung-where-we-are-2026-10-06";this.albums.set(`${normalizeAlias(candidate.artistName)}:${normalizeAlias(candidate.albumName)}`,{id:albumId});candidate.status="VERIFIED";this.verified++;invalidateCatalogCaches();return{albumId}}
}

describe("artist aliases",()=>{
 const aliases=["YESUNG","Yesung","예성","艺声","金钟云","金鐘雲","SUPER JUNIOR YESUNG","SJ艺声"];
 it.each(["YESUNG","艺声","金钟云","예성"])("resolves %s to YESUNG",query=>expect(aliasMatches(query,aliases)).toBe(true));
 it("does not accept an incorrect alias",()=>expect(aliasMatches("金钟国",aliases)).toBe(false));
});

describe("release discovery",()=>{
 beforeEach(()=>invalidateCatalogCaches());
 it("runs zero result -> discovery -> verification -> database -> cache invalidation -> successful search",async()=>{
  const repo=new Repo();cache.set("search:yesung",[{stale:true}],60_000);
  expect(await repo.findAlbum(["YESUNG"],"Where We Are")).toBeNull();
  const service=new ReleaseDiscoveryService([new Provider("Official A",[fixture]),new Provider("Official B",[fixture])],repo);
  const result=await service.discover("金钟云",new Date("2026-09-19T00:00:00Z"));
  expect(result.candidates).toHaveLength(1);expect(result.candidates[0].status).toBe("VERIFIED");expect(repo.verified).toBe(1);
  expect(cache.has("search:yesung")).toBe(false);
  expect(await repo.findAlbum(["YESUNG"],"Where We Are")).toEqual({id:"yesung-where-we-are-2026-10-06"});
 });
 it("fails over when one provider fails",async()=>{const repo=new Repo();const failed:ReleaseSourceProvider={name:"down",trusted:true,discover:async()=>{throw new Error("down")}};const result=await new ReleaseDiscoveryService([failed,new Provider("Official A",[fixture])],repo).discover("艺声",new Date("2026-09-19"));expect(result.candidates).toHaveLength(1);expect(result.allProvidersFailed).toBe(false)});
 it("reports all external providers unavailable",async()=>{const repo=new Repo();const failed:ReleaseSourceProvider={name:"down",trusted:true,discover:async()=>{throw new Error("down")}};const result=await new ReleaseDiscoveryService([failed],repo).discover("YESUNG",new Date("2026-09-19"));expect(result.candidates).toEqual([]);expect(result.allProvidersFailed).toBe(true)});
 it("ignores an alias mismatch",async()=>{const result=await new ReleaseDiscoveryService([new Provider("Official A",[fixture])],new Repo()).discover("TAEMIN",new Date("2026-09-19"));expect(result.candidates).toEqual([])});
 it("does not add a duplicate album",async()=>{const repo=new Repo();repo.albums.set("yesung:whereweare",{id:"existing"});const result=await new ReleaseDiscoveryService([new Provider("Official A",[fixture])],repo).discover("YESUNG",new Date("2026-09-19"));expect(result.candidates).toEqual([])});
 it("routes release date conflicts to review",async()=>{const conflict={...fixture,releaseDate:"2026-10-07"};const result=await new ReleaseDiscoveryService([new Provider("Official A",[fixture]),new Provider("Official B",[conflict])],new Repo()).discover("예성",new Date("2026-09-19"));expect(result.candidates[0].status).toBe("NEEDS_REVIEW");expect(result.candidates[0].conflictReason).toBe("RELEASE_DATE_CONFLICT")});
 it("times out a hanging provider without inventing a release",async()=>{const hanging:ReleaseSourceProvider={name:"slow",trusted:true,discover:({signal})=>new Promise((_,reject)=>signal.addEventListener("abort",()=>reject(new Error("timeout"))))};const result=await new ReleaseDiscoveryService([hanging],new Repo(),5).discover("YESUNG",new Date("2026-09-19"));expect(result.candidates).toEqual([]);expect(result.allProvidersFailed).toBe(true)});
 it("actively removes stale catalog caches",()=>{cache.set("search:yesung",1,60_000);cache.set("artist:yesung",1,60_000);cache.set("album:x",1,60_000);cache.set("comeback:x",1,60_000);cache.set("albums:",1,60_000);invalidateCatalogCaches();expect(["search:yesung","artist:yesung","album:x","comeback:x","albums:"].every(key=>!cache.has(key))).toBe(true)});
});
