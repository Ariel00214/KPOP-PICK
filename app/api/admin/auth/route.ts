import{adminToken}from"@/lib/admin-session";
import{NextResponse}from"next/server";import{z}from"zod";
export async function POST(req:Request){const{password}=z.object({password:z.string()}).parse(await req.json());const expected=process.env.ADMIN_PASSWORD;if(!expected||password!==expected)return NextResponse.json({error:"UNAUTHORIZED"},{status:401});const res=NextResponse.json({ok:true});res.cookies.set("kpop_admin",adminToken(),{httpOnly:true,sameSite:"strict",secure:process.env.NODE_ENV==="production",maxAge:3600});return res}
