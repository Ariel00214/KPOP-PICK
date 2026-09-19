import{NextRequest,NextResponse}from"next/server";import{z}from"zod";import{getCurrentUser,SESSION_COOKIE,verifyPassword}from"@/lib/auth";import{prisma}from"@/lib/prisma";import{allowRequest}from"@/lib/rate-limit";
const schema=z.object({password:z.string().min(1).max(128)});
export async function DELETE(req:NextRequest){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"UNAUTHORIZED"},{status:401});
 const ip=req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";if(!allowRequest(`delete-account:${ip}`,5))return NextResponse.json({error:"操作过于频繁，请稍后再试"},{status:429});
 const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"请输入密码"},{status:400});
 const account=await prisma.account.findUnique({where:{userId:user.id}});if(!account||!await verifyPassword(parsed.data.password,account.passwordHash))return NextResponse.json({error:"密码错误"},{status:403});
 await prisma.user.delete({where:{id:user.id}});const res=NextResponse.json({ok:true});res.cookies.set(SESSION_COOKIE,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:0});return res;
}
