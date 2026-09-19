import{NextRequest,NextResponse}from"next/server";
export function proxy(request:NextRequest){
 if(request.nextUrl.pathname==="/admin/analytics"&&request.cookies.get("kpop_admin")?.value!=="1"){
  return NextResponse.redirect(new URL("/admin/login",request.url));
 }
 return NextResponse.next();
}
export const config={matcher:["/admin/analytics"]};
