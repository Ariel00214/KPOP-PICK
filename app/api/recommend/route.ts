import { NextResponse } from "next/server";
import { z } from "zod";
import { aiProvider } from "@/lib/ai";

const schema = z.object({query:z.string().trim().min(5).max(1000)});

export async function POST(req:Request) {
  try {
    const {query} = schema.parse(await req.json());
    return NextResponse.json(await aiProvider.recommendFromText(query));
  } catch (error) {
    return NextResponse.json({error:"RECOMMENDATION_FAILED",message:error instanceof z.ZodError ? "请用一句话描述你的购买需求" : "暂时无法生成方案"},{status:400});
  }
}
