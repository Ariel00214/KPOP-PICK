import {ArtistAliasType} from "@prisma/client";
import {prisma} from "./prisma";
import {normalizeAlias} from "./artist-alias";
import {invalidateCatalogCaches} from "./cache";

export type CalendarRelease={artist:string;aliases:string[];title:string;releaseDate:string;releaseType:string;confirmed:boolean;sourceUrl:string;updatedAt?:string;coverImageUrl?:string};

function text(row:Record<string,unknown>,...keys:string[]){for(const key of keys)if(typeof row[key]==="string"&&row[key])return String(row[key]);return""}
export function parseCalendarPayload(input:unknown):CalendarRelease[]{
 const source=Array.isArray(input)?input:input&&typeof input==="object"?(input as Record<string,unknown>).releases:[];
 if(!Array.isArray(source))return[];
 return source.flatMap(raw=>{if(!raw||typeof raw!=="object")return[];const row=raw as Record<string,unknown>;
  const artist=text(row,"artist","artistName","artist_name"),title=text(row,"title","albumName","release_title","name"),releaseDate=text(row,"releaseDate","release_date","date"),sourceUrl=text(row,"sourceUrl","source_url","url");
  const type=text(row,"releaseType","release_type","type").toUpperCase().replaceAll(" ","_");
  const aliases=Array.isArray(row.aliases)?row.aliases.filter((v):v is string=>typeof v==="string"):[];
  const confirmed=row.confirmed===true||String(row.status||"").toLowerCase()==="confirmed";
  if(!artist||!title||!/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)||!sourceUrl||!confirmed||!/^(ALBUM|MINI_ALBUM|EP|SINGLE|SINGLE_ALBUM|REPACKAGE|SOLO_RELEASE)$/.test(type))return[];
  return[{artist,aliases,title,releaseDate,releaseType:type,confirmed,sourceUrl,updatedAt:text(row,"updatedAt","updated_at"),coverImageUrl:text(row,"coverImageUrl","cover_image_url","cover")||undefined}];
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
    await prisma.$transaction(async tx=>{
     const names=[item.artist,...item.aliases],normalized=names.map(normalizeAlias);
     let artist=await tx.artist.findFirst({where:{OR:[{name:{in:names,mode:"insensitive"}},{aliases:{some:{normalizedAlias:{in:normalized}}}}]}});
     if(!artist)artist=await tx.artist.create({data:{name:item.artist}});
     await tx.artistAlias.createMany({data:names.map((alias,index)=>({artistId:artist!.id,alias,normalizedAlias:normalizeAlias(alias),aliasType:index?ArtistAliasType.COMMON_ALIAS:ArtistAliasType.STAGE_NAME})),skipDuplicates:true});
     const existing=await tx.album.findFirst({where:{artistId:artist.id,title:{equals:item.title,mode:"insensitive"},releaseDate:new Date(`${item.releaseDate}T00:00:00Z`)}});
     if(existing){await tx.album.update({where:{id:existing.id},data:{sourceName:"K-Pop Calendar",sourceUrl:item.sourceUrl,sourceUpdatedAt:item.updatedAt?new Date(item.updatedAt):new Date(),coverImageUrl:item.coverImageUrl||existing.coverImageUrl,isDemo:false}});updated++;return}
     const id=`${normalizeAlias(item.artist)}-${normalizeAlias(item.title)}-${item.releaseDate}`.slice(0,180);
     await tx.album.create({data:{id,title:item.title,releaseDate:new Date(`${item.releaseDate}T00:00:00Z`),artistId:artist.id,isDemo:false,sourceName:"K-Pop Calendar",sourceUrl:item.sourceUrl,sourceUpdatedAt:item.updatedAt?new Date(item.updatedAt):new Date(),coverImageUrl:item.coverImageUrl}});created++;
    });
   }
   await prisma.systemMetric.create({data:{metricName:"kpop_calendar_sync",value:1,unit:"status",metadata:JSON.stringify({created,updated,count:releases.length})}});invalidateCatalogCaches();return{created,updated,count:releases.length};
  }catch(error){await prisma.systemMetric.create({data:{metricName:"kpop_calendar_sync",value:0,unit:"status",metadata:JSON.stringify({error:error instanceof Error?error.message:"UNKNOWN"})}}).catch(()=>{});throw error}
  finally{clearTimeout(timer)}
 }
}
