import {NextResponse} from "next/server";
import {z} from "zod";
import {prisma} from "@/lib/prisma";
import {recordServerEvent} from "@/lib/analytics-store";
import {permitRequest} from "@/lib/request-limit";
export async function POST(req:Request){
 if(!permitRequest("submissions",15))return NextResponse.json({error:"请求较多，请稍后重试"},{status:429});
 try{
  const text=await req.text();if(text.length>3_000_000)return NextResponse.json({error:"截图过大"},{status:413});
  const body=z.object({rawContent:z.string().min(3).max(10000),extractedData:z.record(z.unknown()).nullable(),sourceType:z.enum(["MISSING_RELEASE","USER_REPORT"]).default("USER_REPORT")}).parse(JSON.parse(text));
  const image=body.extractedData?.image;
  if(image&&!(typeof image==="string"&&/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(image)&&image.length<2_800_000))return NextResponse.json({error:"图片格式无效"},{status:400});
  const extractedData=JSON.stringify(body.extractedData);
  const duplicate=await prisma.submission.findFirst({where:{rawContent:body.rawContent.trim(),extractedData},select:{id:true}});
  if(duplicate)return NextResponse.json({status:"DUPLICATE",duplicateOfId:duplicate.id});
  const record=await prisma.submission.create({data:{anonymousUserId:"anonymous",sourceType:body.sourceType,rawContent:body.rawContent.trim(),extractedData,status:"CONFIRMED"}});
  if(body.sourceType==="MISSING_RELEASE")recordServerEvent("user_reported_missing_release",{});
  return NextResponse.json({status:"CONFIRMED",id:record.id},{status:201});
 }catch{return NextResponse.json({error:"提交未保存，请检查内容并稍后重试"},{status:400})}
}
