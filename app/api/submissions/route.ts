import {NextResponse} from "next/server";
import {z} from "zod";
import {prisma} from "@/lib/prisma";
import {recordServerEvent} from "@/lib/analytics-store";
import {permitRequest} from "@/lib/request-limit";
import {ReleaseVerificationService} from "@/lib/release-verification";
import {normalizeAlias} from "@/lib/artist-alias";

const schema=z.object({artistName:z.string().trim().min(1).max(200),clue:z.string().trim().max(10000).default(""),sourceUrl:z.string().trim().url().refine(v=>v.startsWith("https://")).optional(),image:z.string().optional()}).refine(v=>Boolean(v.clue||v.sourceUrl||v.image),"至少提供一种线索");
export async function POST(req:Request){
 if(!permitRequest("submissions",15))return NextResponse.json({error:"请求较多，请稍后重试"},{status:429});
 try{
  const text=await req.text();if(text.length>3_000_000)return NextResponse.json({error:"截图过大"},{status:413});const body=schema.parse(JSON.parse(text));
  if(body.image&&!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(body.image))return NextResponse.json({error:"图片格式无效"},{status:400});
  const fingerprint=JSON.stringify({artist:normalizeAlias(body.artistName),clue:body.clue.trim(),sourceUrl:body.sourceUrl||""});const duplicate=await prisma.submission.findFirst({where:{rawContent:fingerprint,createdAt:{gte:new Date(Date.now()-30*864e5)}}});
  if(duplicate)return NextResponse.json({status:"DUPLICATE",id:duplicate.id});
  const record=await prisma.submission.create({data:{anonymousUserId:"anonymous",sourceType:"USER_RELEASE_CLUE",rawContent:fingerprint,extractedData:JSON.stringify(body),status:"CONFIRMED"}});recordServerEvent("user_reported_missing_release",{});
  await new ReleaseVerificationService().verifySubmission({submissionId:record.id,...body});
  return NextResponse.json({status:"RECEIVED",id:record.id},{status:201});
 }catch{return NextResponse.json({error:"请填写艺人，并至少提供文字、链接或截图之一"},{status:400})}
}
