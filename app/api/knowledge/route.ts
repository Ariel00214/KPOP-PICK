import{NextRequest,NextResponse}from"next/server";
const docs=[{key:"pob",title:"预购特典卡 · POB",text:"在预售期购买时由指定店铺或平台附赠，通常不放在专辑内部。"},{key:"digipack",title:"纸盒版 · Digipack",text:"一种包装形态，不必然等于成员版；是否可指定成员需要单独确认。"},{key:"random",title:"随机版本",text:"版本、成员或小卡款式由渠道随机发出，购买前应核实随机范围。"},{key:"landed",title:"预计到手价",text:"商品价加已知国际运费、国内运费、服务费和其他费用，再减优惠。未知费用不猜测。"}];
export async function GET(req:NextRequest){const q=(req.nextUrl.searchParams.get("q")||"").toLowerCase();return NextResponse.json({data:docs.filter(d=>`${d.key}${d.title}${d.text}`.toLowerCase().includes(q))})}
