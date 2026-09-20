import {NextRequest,NextResponse} from "next/server";
import {getAlbums} from "@/lib/catalog";
import {cache} from "@/lib/cache";
import {normalizeAlias} from "@/lib/artist-alias";
import {aliasMatches,parseAliasList} from "@/lib/artist-alias";
import {defaultDiscoveryService} from "@/lib/release-discovery";
import {recordServerEvent} from "@/lib/analytics-store";
import type {Album} from "@/lib/types";
import {prisma} from "@/lib/prisma";
import {permitRequest} from "@/lib/request-limit";

export const runtime="nodejs";
export async function GET(req:NextRequest){
 const q=req.nextUrl.searchParams.get("q")?.trim()||"";
 if(!q)return NextResponse.json({data:[],discovery:null});
 const key=`search:${normalizeAlias(q)}`;let data=cache.get<Album[]>(key);
 if(q.length>120)return NextResponse.json({error:"QUERY_TOO_LONG"},{status:400});
 try{if(!data){data=await getAlbums(q,true);cache.set(key,data,5*60_000)}}catch{return NextResponse.json({data:[],discovery:{candidates:[],unavailable:true}},{status:503})}
 recordServerEvent("search_performed",{resultCount:data.length});
 if(data.length)return NextResponse.json({data,discovery:null});
 recordServerEvent("search_zero_result",{});
 const existingCandidates=await prisma.releaseCandidate.findMany({where:{status:{in:["DISCOVERED","NEEDS_REVIEW"]},releaseDate:{gte:new Date(Date.now()-30*864e5),lte:new Date(Date.now()+60*864e5)}},orderBy:{updatedAt:"desc"},take:200});
 const matchedCandidates=existingCandidates.filter(candidate=>aliasMatches(q,[candidate.artistName,...parseAliasList(candidate.artistAliases)])).map(candidate=>({id:candidate.id,artistName:candidate.artistName,artistAliases:parseAliasList(candidate.artistAliases),albumName:candidate.albumName,releaseDate:candidate.releaseDate.toISOString(),releaseType:candidate.releaseType,sourceUrl:candidate.sourceUrl,sourceName:candidate.sourceName,sourcePublishedAt:candidate.sourcePublishedAt?.toISOString(),confidence:candidate.confidence,preorderStarted:candidate.preorderStarted??undefined,status:candidate.status,conflictReason:candidate.conflictReason}));
 if(matchedCandidates.length)return NextResponse.json({data:[],discovery:{candidates:matchedCandidates,unavailable:false}});
 if(!permitRequest("discovery",30))return NextResponse.json({data:[],discovery:{candidates:[],unavailable:true}});
 try{
  const artists=await prisma.artist.findMany({where:{OR:[{name:{equals:q,mode:"insensitive"}},{aliases:{some:{normalizedAlias:normalizeAlias(q)}}}]},take:2});
  if(artists.length>1)return NextResponse.json({data:[],discovery:{candidates:[],unavailable:true}});
  const canonical=artists[0]?.name||q;
  const discoveryKey=`comeback:discovery:${normalizeAlias(canonical)}`;
  let result=cache.get<Awaited<ReturnType<ReturnType<typeof defaultDiscoveryService>["discover"]>>>(discoveryKey);
  if(!result){result=await defaultDiscoveryService().discover(canonical);cache.set(discoveryKey,result,60_000)}
  const verified=await getAlbums(q,true);
  return NextResponse.json({data:verified,discovery:{candidates:result.candidates,unavailable:result.allProvidersFailed}});
 }catch{return NextResponse.json({data:[],discovery:{candidates:[],unavailable:true}})}
}
