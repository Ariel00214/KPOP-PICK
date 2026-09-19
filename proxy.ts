import{validAdminToken}from"./lib/admin-session";
import{NextRequest,NextResponse}from"next/server";
export function proxy(request:NextRequest){
 if(request.nextUrl.pathname.startsWith("/admin/")&&request.nextUrl.pathname!=="/admin/login"&&!validAdminToken(request.cookies.get("kpop_admin")?.value)){
  return NextResponse.redirect(new URL("/admin/login",request.url));
 }
 return NextResponse.next();
}
export const config={matcher:["/admin/:path*"]};
