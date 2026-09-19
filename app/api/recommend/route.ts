import{NextResponse}from"next/server";import{z}from"zod";import{aiProvider}from"@/lib/ai";
const schema=z.object({budget:z.number().min(1).max(100000),avoidRandom:z.boolean().default(false),priority:z.enum(["price","speed"]).default("price")});
export async function POST(req:Request){try{const input=schema.parse(await req.json());const plans=await aiProvider.recommend(input);return NextResponse.json({plans,provider:"rules-fallback"})}catch(e){return NextResponse.json({error:"RECOMMENDATION_FAILED",message:e instanceof z.ZodError?"输入格式不正确":"暂时无法生成方案"},{status:400})}}
