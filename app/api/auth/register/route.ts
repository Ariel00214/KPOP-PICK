import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {createSession,hashPassword,newAnonymousId,normalizeEmail,SESSION_COOKIE,sessionCookieOptions} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import {allowRequest} from "@/lib/rate-limit";

const schema=z.object({email:z.string().email().max(254),password:z.string().min(8).max(128),displayName:z.string().trim().min(1).max(30).optional()});
export async function POST(req:NextRequest){
 const ip=req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
 if(!allowRequest(`register:${ip}`,5))return NextResponse.json({error:"操作过于频繁，请稍后再试"},{status:429});
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"请输入有效邮箱，密码至少 8 位"},{status:400});
 const email=normalizeEmail(parsed.data.email);
 if(await prisma.account.findUnique({where:{email}}))return NextResponse.json({error:"该邮箱已注册"},{status:409});
 const user=await prisma.user.create({data:{anonymousId:newAnonymousId(),displayName:parsed.data.displayName,account:{create:{email,passwordHash:await hashPassword(parsed.data.password)}}}});
 const session=await createSession(user.id);const res=NextResponse.json({user:{id:user.id,email,displayName:user.displayName}},{status:201});
 res.cookies.set(SESSION_COOKIE,session.token,sessionCookieOptions(session.expiresAt));return res;
}
