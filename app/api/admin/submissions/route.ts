import {NextRequest,NextResponse} from "next/server";
import {validAdminToken} from "@/lib/admin-session";
import {prisma} from "@/lib/prisma";
import {PrismaDiscoveryRepository} from "@/lib/release-discovery";
import {z} from "zod";
export async function GET(req:NextRequest){if(!validAdminToken(req.cookies.get("kpop_admin")?.value))return new NextResponse(null,{status:401});return NextResponse.json({data:await prisma.submission.findMany({where:{status:"CONFIRMED"},orderBy:{createdAt:"desc"},take:20})})}
export async function POST(req:NextRequest){
 if(!validAdminToken(req.cookies.get("kpop_admin")?.value))return new NextResponse(null,{status:401});
 try{const body=z.object({id:z.string(),artistName:z.string().min(1),albumName:z.string().min(1),releaseDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),sourceUrl:z.string().url().refine(v=>v.startsWith("https://"))}).parse(await req.json());
 const submission=await prisma.submission.findUniqueOrThrow({where:{id:body.id}});if(submission.status!=="CONFIRMED")return NextResponse.json({error:"ALREADY_PROCESSED"},{status:409});
 const repo=new PrismaDiscoveryRepository();const existing=await repo.findAlbum([body.artistName],body.albumName);
 if(existing){await prisma.submission.update({where:{id:body.id},data:{status:"DUPLICATE",duplicateOfId:existing.id}});return NextResponse.json({albumId:existing.id})}
 const release={...body,artistAliases:[],releaseType:"ALBUM",sourceName:"管理员核对用户公告",confidence:1};
 const candidate=await repo.saveCandidate(release,"NEEDS_REVIEW",[release]);
 return NextResponse.json({candidateId:candidate.id,status:candidate.status});
 }catch{return NextResponse.json({error:"请填写已核实的艺人、专辑、日期和 HTTPS 来源链接"},{status:400})}
}
