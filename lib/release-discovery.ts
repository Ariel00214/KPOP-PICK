import {ArtistAliasType,ReleaseCandidateStatus} from "@prisma/client";
import {prisma} from "./prisma";
import {normalizeAlias} from "./artist-alias";
import {invalidateCatalogCaches} from "./cache";
import {recordServerEvent} from "./analytics-store";

export type DiscoveredRelease={
 artistName:string;artistAliases:string[];albumName:string;releaseDate:string;releaseType:string;
 sourceUrl:string;sourceName:string;sourcePublishedAt?:string;confidence:number;preorderStarted?:boolean;
};
export interface ReleaseSourceProvider{name:string;trusted:boolean;discover(input:{query?:string;from:Date;to:Date;signal:AbortSignal}):Promise<DiscoveredRelease[]>}
export interface StoredCandidate extends DiscoveredRelease{id:string;status:"DISCOVERED"|"VERIFIED"|"REJECTED"|"NEEDS_REVIEW";conflictReason?:string|null;evidence?:DiscoveredRelease[]}
export interface DiscoveryRepository{
 findAlbum(artistAliases:string[],albumName:string):Promise<{id:string}|null>;
 saveCandidate(release:DiscoveredRelease,status:StoredCandidate["status"],evidence:DiscoveredRelease[],conflictReason?:string):Promise<StoredCandidate>;
 verifyCandidate(candidate:StoredCandidate):Promise<{albumId:string}>;
}

const allowedTypes=new Set(["ALBUM","EP","MINI_ALBUM","SINGLE_ALBUM","PHYSICAL_ALBUM"]);
const typeMap:Record<string,string>={Album:"ALBUM",EP:"EP",Single:"SINGLE_ALBUM"};
export function discoveryWindow(now=new Date()){return{from:new Date(now.getTime()-30*864e5),to:new Date(now.getTime()+60*864e5)}}
export function parseInterval(value=process.env.RELEASE_DISCOVERY_INTERVAL||"6h"){
 const match=/^(\d+)(m|h|d)$/i.exec(value.trim());if(!match)return 6*3600_000;
 const n=Number(match[1]),unit=match[2].toLowerCase();return Math.max(60_000,n*(unit==="m"?60_000:unit==="h"?3600_000:86400_000));
}

export class JsonFeedProvider implements ReleaseSourceProvider{
 name="Configured release feed";trusted=true;
 constructor(private url=process.env.RELEASE_DISCOVERY_FEED_URL||""){}
 async discover({query,from,to,signal}:{query?:string;from:Date;to:Date;signal:AbortSignal}){
  if(!this.url)return[];const response=await fetch(this.url,{signal,headers:{accept:"application/json"}});if(!response.ok)throw new Error(`Feed ${response.status}`);
  const rows=await response.json();if(!Array.isArray(rows))throw new Error("Invalid release feed");
  return rows.filter((row):row is DiscoveredRelease=>Boolean(row&&typeof row.artistName==="string"&&typeof row.albumName==="string"&&typeof row.releaseDate==="string"&&typeof row.sourceUrl==="string"))
   .filter(row=>{const d=new Date(row.releaseDate);return d>=from&&d<=to&&(!query||[row.artistName,...(row.artistAliases||[])].some(v=>normalizeAlias(v)===normalizeAlias(query)))})
   .map(row=>({...row,artistAliases:Array.isArray(row.artistAliases)?row.artistAliases:[],sourceName:row.sourceName||this.name,confidence:Number(row.confidence)||.8,releaseType:String(row.releaseType||"ALBUM").toUpperCase().replaceAll(" ","_")}));
 }
}

export class MusicBrainzProvider implements ReleaseSourceProvider{
 name="MusicBrainz";trusted=true;
 async discover({query,from,to,signal}:{query?:string;from:Date;to:Date;signal:AbortSignal}){
  if(!query)return[];
  await musicBrainzRateLimit();
  const term=`artist:${JSON.stringify(query)}`;
  const url=`https://musicbrainz.org/ws/2/release-group/?query=${encodeURIComponent(term)}&fmt=json&limit=15`;
  const response=await fetch(url,{signal,headers:{accept:"application/json","user-agent":`KPOPPick/0.1 (${process.env.SUPPORT_EMAIL||"https://www.myarea.website"})`}});
  if(!response.ok)throw new Error(`MusicBrainz ${response.status}`);const body=await response.json();
  return (Array.isArray(body["release-groups"])?body["release-groups"]:[]).flatMap((row:any)=>{
   const date=new Date(`${row["first-release-date"]||""}T00:00:00Z`);const releaseType=typeMap[row["primary-type"]]||"";
   const credits=Array.isArray(row["artist-credit"])?row["artist-credit"]:[];const artistName=credits.map((c:any)=>c.name).filter(Boolean).join("");
   if(!releaseType||!date.getTime()||date<from||date>to||!artistName)return[];
   return[{artistName,artistAliases:[],albumName:String(row.title),releaseDate:date.toISOString().slice(0,10),releaseType,sourceUrl:`https://musicbrainz.org/release-group/${row.id}`,sourceName:this.name,confidence:Math.min(.95,Number(row.score||80)/100)}];
  });
 }
}

let lastMusicBrainzRequest=0;let musicBrainzQueue=Promise.resolve();
function musicBrainzRateLimit(){const turn=musicBrainzQueue.then(async()=>{const wait=Math.max(0,1000-(Date.now()-lastMusicBrainzRequest));if(wait)await new Promise(resolve=>setTimeout(resolve,wait));lastMusicBrainzRequest=Date.now()});musicBrainzQueue=turn.catch(()=>{});return turn}

export function withTimeout<T>(promise:(signal:AbortSignal)=>Promise<T>,ms:number){const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error("Provider timeout"))},ms)});return Promise.race([Promise.resolve().then(()=>promise(controller.signal)),timeout]).finally(()=>clearTimeout(timer))}
function dateKey(value:string){return new Date(value).toISOString().slice(0,10)}

export class ReleaseDiscoveryService{
 constructor(private providers:ReleaseSourceProvider[],private repository:DiscoveryRepository=new PrismaDiscoveryRepository(),private timeoutMs=5000){}
 async discover(query?:string,now=new Date()){
  const window=discoveryWindow(now);recordServerEvent("discovery_triggered",{mode:query?"search_fallback":"scheduled"});
  const settled=await Promise.allSettled(this.providers.map(provider=>withTimeout(signal=>provider.discover({...window,query,signal}),this.timeoutMs).then(rows=>({provider,rows}))));
  const releases=settled.flatMap(result=>result.status==="fulfilled"?result.value.rows.map(row=>({row,provider:result.value.provider})):[])
   .filter(({row})=>allowedTypes.has(row.releaseType)&&new Date(row.releaseDate)>=window.from&&new Date(row.releaseDate)<=window.to)
   .filter(({row})=>!query||[row.artistName,...row.artistAliases].some(value=>normalizeAlias(value)===normalizeAlias(query)));
  const groups=new Map<string,Array<{row:DiscoveredRelease;provider:ReleaseSourceProvider}>>();
  for(const item of releases){const key=`${normalizeAlias(item.row.artistName)}:${normalizeAlias(item.row.albumName)}`;groups.set(key,[...(groups.get(key)||[]),item])}
  const candidates:StoredCandidate[]=[];
  for(const items of groups.values()){
   const first=items[0].row;const duplicate=await this.repository.findAlbum([first.artistName,...first.artistAliases],first.albumName);if(duplicate)continue;
   const dates=new Set(items.map(item=>dateKey(item.row.releaseDate)));const trusted=new Set(items.filter(item=>item.provider.trusted&&item.row.confidence>=.9).map(item=>{try{return new URL(item.row.sourceUrl).hostname.replace(/^www\./,"")}catch{return ""}}).filter(Boolean));
   const status:StoredCandidate["status"]=dates.size>1?"NEEDS_REVIEW":trusted.size>=2?"VERIFIED":"DISCOVERED";
   const candidate=await this.repository.saveCandidate(first,status,items.map(item=>item.row),dates.size>1?"RELEASE_DATE_CONFLICT":undefined);
   recordServerEvent("release_candidate_found",{status:candidate.status,sourceCount:items.length});
   if(candidate.status==="VERIFIED"){await this.repository.verifyCandidate(candidate);recordServerEvent("release_candidate_verified",{candidateId:candidate.id})}
   candidates.push(candidate);
  }
  return{candidates,allProvidersFailed:settled.length>0&&settled.every(result=>result.status==="rejected")};
 }
 async verify(candidate:StoredCandidate){const result=await this.repository.verifyCandidate({...candidate,status:"VERIFIED"});recordServerEvent("release_candidate_verified",{candidateId:candidate.id});return result}
}

export class PrismaDiscoveryRepository implements DiscoveryRepository{
 async findAlbum(aliases:string[],albumName:string){
  const normalized=aliases.map(normalizeAlias);return prisma.album.findFirst({where:{title:{equals:albumName,mode:"insensitive"},OR:[{artist:{name:{in:aliases,mode:"insensitive"}}},{artist:{aliases:{some:{normalizedAlias:{in:normalized}}}}},{group:{name:{in:aliases,mode:"insensitive"}}}]},select:{id:true}});
 }
 async saveCandidate(release:DiscoveredRelease,status:StoredCandidate["status"],evidence:DiscoveredRelease[],conflictReason?:string){
  const previous=await prisma.releaseCandidate.findMany({where:{normalizedArtist:normalizeAlias(release.artistName),normalizedAlbum:normalizeAlias(release.albumName)}});
  if(previous.some(row=>row.releaseDate.toISOString().slice(0,10)!==release.releaseDate.slice(0,10))){status="NEEDS_REVIEW";conflictReason="RELEASE_DATE_CONFLICT";await prisma.releaseCandidate.updateMany({where:{id:{in:previous.filter(row=>row.status!=="VERIFIED"&&row.status!=="REJECTED").map(row=>row.id)}},data:{status:"NEEDS_REVIEW",conflictReason}})}
  const rejected=previous.find(row=>row.status==="REJECTED");
  if(rejected)return{...release,id:rejected.id,status:"REJECTED" as const,conflictReason:rejected.conflictReason,evidence};
  const date=new Date(`${release.releaseDate.slice(0,10)}T00:00:00Z`);const row=await prisma.releaseCandidate.upsert({where:{normalizedArtist_normalizedAlbum_releaseDate_sourceUrl:{normalizedArtist:normalizeAlias(release.artistName),normalizedAlbum:normalizeAlias(release.albumName),releaseDate:date,sourceUrl:release.sourceUrl}},update:{status:status as ReleaseCandidateStatus,evidence:JSON.stringify(evidence),conflictReason},create:{artistName:release.artistName,artistAliases:JSON.stringify(release.artistAliases),albumName:release.albumName,normalizedArtist:normalizeAlias(release.artistName),normalizedAlbum:normalizeAlias(release.albumName),releaseDate:date,releaseType:release.releaseType,preorderStarted:release.preorderStarted,sourceName:release.sourceName,sourceUrl:release.sourceUrl,sourcePublishedAt:release.sourcePublishedAt?new Date(release.sourcePublishedAt):null,confidence:release.confidence,evidence:JSON.stringify(evidence),status:status as ReleaseCandidateStatus,conflictReason}});
  return{...release,id:row.id,status:row.status,conflictReason:row.conflictReason,evidence};
 }
 async verifyCandidate(candidate:StoredCandidate){
  return prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(824713)`;
  const persisted=await tx.releaseCandidate.findUniqueOrThrow({where:{id:candidate.id}});
  if(persisted.status==="REJECTED")throw new Error("Rejected candidate");
  if(persisted.verifiedAlbumId)return{albumId:persisted.verifiedAlbumId};
  const aliases=[candidate.artistName,...candidate.artistAliases];const normalized=aliases.map(normalizeAlias);
  const matches=await tx.artist.findMany({where:{OR:[{name:{in:aliases,mode:"insensitive"}},{aliases:{some:{normalizedAlias:{in:normalized}}}}]}});
  if(matches.length>1)throw new Error("Ambiguous artist identity");
  let artist=matches[0];
  if(!artist)artist=await tx.artist.create({data:{name:candidate.artistName}});
  await tx.artistAlias.createMany({data:aliases.map((alias,index)=>({artistId:artist.id,alias,normalizedAlias:normalizeAlias(alias),language:null,aliasType:(index?ArtistAliasType.COMMON_ALIAS:ArtistAliasType.STAGE_NAME)})),skipDuplicates:true});
  const existing=await tx.album.findFirst({where:{artistId:artist.id,title:{equals:candidate.albumName,mode:"insensitive"}}});
  if(existing&&existing.releaseDate.toISOString().slice(0,10)!==candidate.releaseDate.slice(0,10))throw new Error("Release date conflict");
  const albumId=existing?.id||`${artist.id}-${normalizeAlias(candidate.albumName)}`.slice(0,160);
  await tx.album.upsert({where:{id:albumId},update:{isDemo:false},create:{id:albumId,title:candidate.albumName,releaseDate:new Date(`${candidate.releaseDate.slice(0,10)}T00:00:00Z`),artistId:artist.id,isDemo:false}});
  await tx.releaseCandidate.update({where:{id:candidate.id},data:{status:ReleaseCandidateStatus.VERIFIED,verifiedAlbumId:albumId}});
  return{albumId};
  }).then(result=>{invalidateCatalogCaches();return result});
 }
}

export function defaultDiscoveryService(){return new ReleaseDiscoveryService([...(process.env.RELEASE_DISCOVERY_FEED_URL?[new JsonFeedProvider()]:[]),new MusicBrainzProvider()])}
