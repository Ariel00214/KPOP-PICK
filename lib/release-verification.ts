import {prisma} from "./prisma";
import {normalizeAlias} from "./artist-alias";
import {defaultDiscoveryService,PrismaDiscoveryRepository,type DiscoveredRelease} from "./release-discovery";

export type VerificationOrigin="USER_SUBMISSION"|"NIGHTLY_SCAN";
type SubmissionInput={submissionId:string;artistName:string;clue?:string;sourceUrl?:string;image?:string};
const releaseTypes=new Set(["ALBUM","MINI_ALBUM","EP","SINGLE","SINGLE_ALBUM","REPACKAGE","SOLO_RELEASE"]);
const officialPlatformHosts=new Set(["weverse.io","shop.weverse.io"]);

function validDate(value:unknown):value is string{return typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())}
export function evaluateReleaseFacts(facts:Record<string,unknown>|null,isOfficial:boolean){const missing:string[]=[];if(!facts||typeof facts.artistName!=="string"||!facts.artistName.trim())missing.push("artist");if(!facts||typeof facts.albumName!=="string"||!facts.albumName.trim())missing.push("release_title");if(!facts||typeof facts.releaseType!=="string"||!releaseTypes.has(facts.releaseType))missing.push("release_type");if(!facts||!validDate(facts.releaseDate))missing.push("release_date");if(!isOfficial)missing.push("official_source");return{status:missing.length?"PENDING"as const:"CONFIRMED"as const,missing}}
function safeHttps(value:string){try{const url=new URL(value);return url.protocol==="https:"&&!/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname)?url:null}catch{return null}}
function cleanText(html:string){return html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;|&amp;|&#39;|&quot;/g," ").replace(/\s+/g," ").trim().slice(0,12000)}

async function sourceRecordFor(artistName:string,url:URL){
 const normalized=normalizeAlias(artistName);const artist=await prisma.artist.findFirst({where:{OR:[{name:{equals:artistName,mode:"insensitive"}},{aliases:{some:{normalizedAlias:normalized}}}]},include:{officialSources:{where:{active:true}}}});
 const match=artist?.officialSources.find(source=>{try{const known=new URL(source.sourceUrl);return known.hostname===url.hostname&&url.pathname.startsWith(known.pathname.replace(/\/$/,""))}catch{return false}});
 if(match)return match;
 if(officialPlatformHosts.has(url.hostname))return prisma.officialSource.findFirst({where:{active:true,sourceUrl:{startsWith:`${url.protocol}//${url.hostname}`},OR:[{artistId:artist?.id},{artistId:null}]}});
 return null;
}

async function fetchSource(url:URL){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);try{const response=await fetch(url,{signal:controller.signal,redirect:"follow",headers:{"user-agent":"KPOPPick/0.1 (+https://www.myarea.website)",accept:"text/html,application/json"}});if(!response.ok)return null;const text=await response.text();return cleanText(text)}catch{return null}finally{clearTimeout(timer)}}

async function extractFacts(input:{artistName:string;clue:string;pageText:string;image?:string}){
 if(process.env.AI_PROVIDER!=="llm"||!process.env.AI_API_KEY||!process.env.AI_BASE_URL||!process.env.AI_MODEL)return null;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{
  const text=`目标艺人：${input.artistName}\n用户线索：${input.clue}\n官方页面文字：${input.pageText}`.slice(0,15000);
  const userContent:unknown=input.image?[{type:"text",text},{type:"image_url",image_url:{url:input.image}}]:text;
  const response=await fetch(`${process.env.AI_BASE_URL.replace(/\/$/,"")}/chat/completions`,{method:"POST",signal:controller.signal,headers:{"content-type":"application/json",authorization:`Bearer ${process.env.AI_API_KEY}`},body:JSON.stringify({model:process.env.AI_MODEL,temperature:0,response_format:{type:"json_object"},messages:[{role:"system",content:"从提供的证据提取K-pop正式音乐发行信息。只输出JSON：artistName, artistAliases(数组), albumName, releaseDate(必须YYYY-MM-DD，否则null), releaseType(ALBUM/MINI_ALBUM/EP/SINGLE/SINGLE_ALBUM/REPACKAGE/SOLO_RELEASE之一，否则null), sourcePublishedAt(ISO时间或null), originalExcerpt(证据原文关键句，不得编造), coverImageUrl(https或null), preorderStarted(布尔或null)。不得根据常识补写未知事实。"},{role:"user",content:userContent}]})});
  if(!response.ok)return null;const payload=await response.json()as{choices?:Array<{message?:{content?:string}}>};const content=payload.choices?.[0]?.message?.content;if(!content)return null;return JSON.parse(content)as Record<string,unknown>;
 }catch{return null}finally{clearTimeout(timer)}
}

export class ReleaseVerificationService{
 private repo=new PrismaDiscoveryRepository();
 async verifySubmission(input:SubmissionInput){
  const url=input.sourceUrl?safeHttps(input.sourceUrl):null;let official=null,pageText="";
  if(url){official=await sourceRecordFor(input.artistName,url);if(official)pageText=await fetchSource(url)||""}
  const facts=await extractFacts({artistName:input.artistName,clue:input.clue||"",pageText,image:input.image});
  if(evaluateReleaseFacts(facts,Boolean(official)).status==="CONFIRMED"&&official&&facts&&validDate(facts.releaseDate)&&typeof facts.albumName==="string"&&typeof facts.releaseType==="string"){
   const release:DiscoveredRelease={artistName:typeof facts.artistName==="string"&&facts.artistName.trim()?facts.artistName:input.artistName,artistAliases:Array.isArray(facts.artistAliases)?facts.artistAliases.filter((v):v is string=>typeof v==="string"):[],albumName:facts.albumName.trim(),releaseDate:facts.releaseDate,releaseType:facts.releaseType,sourceUrl:url!.toString(),sourceName:official.sourceName,sourceType:official.sourceType,sourcePublishedAt:typeof facts.sourcePublishedAt==="string"?facts.sourcePublishedAt:undefined,confidence:1,preorderStarted:typeof facts.preorderStarted==="boolean"?facts.preorderStarted:undefined,coverImageUrl:typeof facts.coverImageUrl==="string"&&safeHttps(facts.coverImageUrl)?facts.coverImageUrl:undefined,isOfficial:true,originalExcerpt:typeof facts.originalExcerpt==="string"?facts.originalExcerpt.slice(0,2000):pageText.slice(0,2000),origin:"USER_SUBMISSION",submissionId:input.submissionId};
   const candidate=await this.repo.saveCandidate(release,"NEEDS_REVIEW",[release]);await prisma.submission.update({where:{id:input.submissionId},data:{status:"DUPLICATE",duplicateOfId:candidate.id,verificationError:null}});return{candidateId:candidate.id,status:"CONFIRMED"};
  }
  const discovered=await defaultDiscoveryService().discover(input.artistName).catch(()=>({candidates:[]}));const candidate=discovered.candidates[0];
  await prisma.submission.update({where:{id:input.submissionId},data:{verificationError:official?pageText?"明确日期或正式发行信息尚未确认":"官方来源暂时无法读取":"尚未匹配到该艺人的已维护官方来源"}});
  return{candidateId:candidate?.id,status:"PENDING"};
 }

 async nightlyScan(){
  const sources=await prisma.officialSource.findMany({where:{active:true},include:{artist:{include:{aliases:true}}},orderBy:{lastScannedAt:"asc"},take:100});let candidates=0;
  for(const source of sources){const url=safeHttps(source.sourceUrl);if(!url)continue;const pageText=await fetchSource(url);await prisma.officialSource.update({where:{id:source.id},data:{lastScannedAt:new Date()}});if(!pageText||!source.artist)continue;const facts=await extractFacts({artistName:source.artist.name,clue:"每日官方来源巡检",pageText});if(evaluateReleaseFacts(facts,true).status!=="CONFIRMED"||!facts||!validDate(facts.releaseDate)||typeof facts.albumName!=="string"||typeof facts.releaseType!=="string")continue;
   const release:DiscoveredRelease={artistName:source.artist.name,artistAliases:source.artist.aliases.map(a=>a.alias),albumName:facts.albumName.trim(),releaseDate:facts.releaseDate,releaseType:facts.releaseType,sourceUrl:source.sourceUrl,sourceName:source.sourceName,sourceType:source.sourceType,sourcePublishedAt:typeof facts.sourcePublishedAt==="string"?facts.sourcePublishedAt:undefined,confidence:1,preorderStarted:typeof facts.preorderStarted==="boolean"?facts.preorderStarted:undefined,coverImageUrl:typeof facts.coverImageUrl==="string"&&safeHttps(facts.coverImageUrl)?facts.coverImageUrl:undefined,isOfficial:true,originalExcerpt:typeof facts.originalExcerpt==="string"?facts.originalExcerpt.slice(0,2000):pageText.slice(0,2000),origin:"NIGHTLY_SCAN"};
   await this.repo.saveCandidate(release,"NEEDS_REVIEW",[release]);candidates++;
  }
  return{scanned:sources.length,candidates};
 }
 async reverifyCandidate(candidateId:string){const candidate=await prisma.releaseCandidate.findUniqueOrThrow({where:{id:candidateId}});if(candidate.submissionId){const submission=await prisma.submission.findUniqueOrThrow({where:{id:candidate.submissionId}});const data=JSON.parse(submission.extractedData||"{}")as SubmissionInput;return this.verifySubmission({submissionId:submission.id,artistName:data.artistName,clue:data.clue,sourceUrl:data.sourceUrl,image:data.image})}return this.nightlyScan()}
}

export function parseOfficialSourcesEnv(value=process.env.OFFICIAL_RELEASE_SOURCES_JSON||""){try{const rows=JSON.parse(value);return Array.isArray(rows)?rows.filter(row=>row&&typeof row.sourceUrl==="string"&&typeof row.sourceName==="string"&&typeof row.sourceType==="string"):[]}catch{return[]}}
