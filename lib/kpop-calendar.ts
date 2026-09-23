import {ArtistAliasType} from "@prisma/client";
import {prisma} from "./prisma";
import {normalizeAlias} from "./artist-alias";
import {invalidateCatalogCaches} from "./cache";
import {findAppleAlbumMetadata} from "./artwork";

export type CalendarRelease={artist:string;aliases:string[];title:string;releaseDate:string;releaseType:string;confirmed:boolean;sourceUrl:string;updatedAt?:string;coverImageUrl?:string};

function text(row:Record<string,unknown>,...keys:string[]){for(const key of keys)if(typeof row[key]==="string"&&row[key])return String(row[key]);return""}
function calendarEventTitle(value:string,artist:string){const quoted=[...value.matchAll(/['‘’“"]([^'‘’“"]{2,120})['‘’“"]/g)].map(match=>match[1].trim());return quoted[0]||value.replace(new RegExp(`^${artist.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\s*[-—:]?\\s*`,"i"),"").replace(/\s+(?:Release|Comeback).*$/i,"").trim()||value}
function calendarEventType(value:string){const normalized=value.toLowerCase();if(/mini album/.test(normalized))return"MINI_ALBUM";if(/\bep\b/.test(normalized))return"EP";if(/repackage|reissue|complete edition/.test(normalized))return"REPACKAGE";if(/single album/.test(normalized))return"SINGLE_ALBUM";return"ALBUM"}
export function parseCalendarPayload(input:unknown):CalendarRelease[]{
 const root=input&&typeof input==="object"&&!Array.isArray(input)?input as Record<string,unknown>:null;const source=Array.isArray(input)?input:root?.releases||root?.events||[];const generated=root?.meta&&typeof root.meta==="object"?text(root.meta as Record<string,unknown>,"generated"):"";
 if(!Array.isArray(source))return[];
 return source.flatMap(raw=>{if(!raw||typeof raw!=="object")return[];const row=raw as Record<string,unknown>;
  const artistValue=row.artist&&typeof row.artist==="object"?row.artist as Record<string,unknown>:null;const artist=text(row,"artist","artistName","artist_name")||text(artistValue||{},"name");const eventTitle=text(row,"title","albumName","release_title","name"),releaseDate=text(row,"releaseDate","release_date","date"),sourceUrl=text(row,"sourceUrl","source_url","url");
  const rawType=text(row,"releaseType","release_type","type"),isCalendarEvent=rawType==="comeback"||rawType==="release";const type=isCalendarEvent?calendarEventType(`${eventTitle} ${text(row,"description")}`):rawType.toUpperCase().replaceAll(" ","_");const title=isCalendarEvent?calendarEventTitle(eventTitle,artist):eventTitle;
  const aliases=Array.from(new Set([...(Array.isArray(row.aliases)?row.aliases.filter((v):v is string=>typeof v==="string"):[]),text(artistValue||{},"name_ko")].filter(Boolean)));
  const confirmed=row.confirmed===true||String(row.status||"").toLowerCase()==="confirmed";
  if(!artist||!title||!/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)||!sourceUrl||!confirmed||(!isCalendarEvent&&!/^(ALBUM|MINI_ALBUM|EP|SINGLE|SINGLE_ALBUM|REPACKAGE|SOLO_RELEASE)$/.test(type))||(isCalendarEvent&&/digital single/i.test(`${eventTitle} ${text(row,"description")}`)))return[];
  return[{artist,aliases,title,releaseDate,releaseType:type,confirmed,sourceUrl,updatedAt:text(row,"updatedAt","updated_at")||generated||undefined,coverImageUrl:text(row,"coverImageUrl","cover_image_url","cover")||undefined}];
 });
}

export class KpopCalendarService{
 constructor(private url=process.env.KPOP_CALENDAR_URL||""){}
 async sync(){
  if(!this.url)throw new Error("KPOP_CALENDAR_URL_NOT_CONFIGURED");
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),Number(process.env.KPOP_CALENDAR_TIMEOUT_MS||8000));
  try{
   const response=await fetch(this.url,{headers:{accept:"application/json"},signal:controller.signal});if(!response.ok)throw new Error(`KPOP_CALENDAR_HTTP_${response.status}`);
   const releases=parseCalendarPayload(await response.json());let created=0,updated=0;
   for(const item of releases){
    const albumId=await prisma.$transaction(async tx=>{
     const names=[item.artist,...item.aliases],normalized=names.map(normalizeAlias);
     let artist=await tx.artist.findFirst({where:{OR:[{name:{in:names,mode:"insensitive"}},{aliases:{some:{normalizedAlias:{in:normalized}}}}]}});
     if(!artist)artist=await tx.artist.create({data:{name:item.artist}});
     await tx.artistAlias.createMany({data:names.map((alias,index)=>({artistId:artist!.id,alias,normalizedAlias:normalizeAlias(alias),aliasType:index?ArtistAliasType.COMMON_ALIAS:ArtistAliasType.STAGE_NAME})),skipDuplicates:true});
     const existing=await tx.album.findFirst({where:{artistId:artist.id,title:{equals:item.title,mode:"insensitive"},releaseDate:new Date(`${item.releaseDate}T00:00:00Z`)}});
     if(existing){await tx.album.update({where:{id:existing.id},data:{sourceName:"K-Pop Calendar",sourceUrl:item.sourceUrl,sourceUpdatedAt:item.updatedAt?new Date(item.updatedAt):new Date(),coverImageUrl:item.coverImageUrl||existing.coverImageUrl,isDemo:false}});updated++;return existing.id}
     const id=`${normalizeAlias(item.artist)}-${normalizeAlias(item.title)}-${item.releaseDate}`.slice(0,180);
     await tx.album.create({data:{id,title:item.title,releaseDate:new Date(`${item.releaseDate}T00:00:00Z`),albumType:item.releaseType,artistId:artist.id,isDemo:false,sourceName:"K-Pop Calendar",sourceUrl:item.sourceUrl,sourceUpdatedAt:item.updatedAt?new Date(item.updatedAt):new Date(),coverImageUrl:item.coverImageUrl}});created++;return id;
    });
    const metadata=await findAppleAlbumMetadata(item.artist,item.title,item.releaseDate);if(metadata)await prisma.album.update({where:{id:albumId},data:{appleMusicId:metadata.appleMusicId,title:metadata.title,coverImageUrl:metadata.coverImageUrl||undefined,releaseDate:metadata.releaseDate?new Date(`${metadata.releaseDate}T00:00:00Z`):undefined,albumType:metadata.albumType||item.releaseType,trackCount:metadata.trackCount||undefined}}).catch(()=>{});
   }
   await prisma.systemMetric.create({data:{metricName:"kpop_calendar_sync",value:1,unit:"status",metadata:JSON.stringify({created,updated,count:releases.length})}});invalidateCatalogCaches();return{created,updated,count:releases.length};
  }catch(error){await prisma.systemMetric.create({data:{metricName:"kpop_calendar_sync",value:0,unit:"status",metadata:JSON.stringify({error:error instanceof Error?error.message:"UNKNOWN"})}}).catch(()=>{});throw error}
  finally{clearTimeout(timer)}
 }
}
