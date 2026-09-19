import{NextResponse}from"next/server";import{defaultDiscoveryService}from"@/lib/release-discovery";
export const runtime="nodejs";
export async function POST(req:Request){const secret=process.env.DISCOVERY_CRON_SECRET;if(!secret||req.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({error:"UNAUTHORIZED"},{status:401});const result=await defaultDiscoveryService().discover();return NextResponse.json({candidateCount:result.candidates.length,allProvidersFailed:result.allProvidersFailed})}
