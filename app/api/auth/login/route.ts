import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {createSession,normalizeEmail,SESSION_COOKIE,sessionCookieOptions,verifyPassword} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import {allowRequest} from "@/lib/rate-limit";
const schema=z.object({email:z.string().email(),password:z.string().min(1).max(128)});
export async function POST(req:NextRequest){
 const ip=req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
 if(!allowRequest(`login:${ip}`,10))return NextResponse.json({error:"登录尝试过多，请稍后再试"},{status:429});
 const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"邮箱或密码错误"},{status:400});
 const account=await prisma.account.findUnique({where:{email:normalizeEmail(parsed.data.email)},include:{user:true}});
 if(!account||!await verifyPassword(parsed.data.password,account.passwordHash))return NextResponse.json({error:"邮箱或密码错误"},{status:401});
 const session=await createSession(account.userId);const res=NextResponse.json({user:{id:account.userId,email:account.email,displayName:account.user.displayName}});
 res.cookies.set(SESSION_COOKIE,session.token,sessionCookieOptions(session.expiresAt));return res;
}
