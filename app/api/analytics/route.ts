import{NextResponse}from"next/server";import{z}from"zod";import{allowedEvents,safeProperties}from"@/lib/analytics";import{pushEvent,summarize}from"@/lib/analytics-store";
const schema=z.object({anonymousUserId:z.string().max(100).optional().default("anonymous"),sessionId:z.string().max(100).optional().default("unknown"),eventName:z.enum(allowedEvents),properties:z.record(z.unknown()).optional().default({})});
export async function POST(req:Request){try{const e=schema.parse(await req.json());queueMicrotask(()=>pushEvent({...e,properties:safeProperties(e.properties),createdAt:new Date()}));return new NextResponse(null,{status:202})}catch{return new NextResponse(null,{status:204})}}
export async function GET(){return NextResponse.json(summarize())}
