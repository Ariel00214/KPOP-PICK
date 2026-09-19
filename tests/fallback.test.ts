import{describe,it,expect}from"vitest";import{parsePurchaseIntent,RulesProvider}from"@/lib/ai";
describe("AI fallback",()=>{
  it("无模型密钥也可给出规则推荐",async()=>expect(await new RulesProvider().recommend({budget:200,avoidRandom:false,priority:"price"})).toBeTruthy());
  it("可从文本提取价格",async()=>expect((await new RulesProvider().extract("DEADLINE PINK版 79元")).price).toBe(79));
  it("能理解自然语言购买需求",()=>expect(parsePurchaseIntent("我想买 ENHYPEN DESIRE : UNLEASH，预算150元以内，小卡多一点")).toMatchObject({artist:"ENHYPEN",budget:150,priority:"benefits"}));
  it("文字推荐会返回解释和正确专辑链接信息",async()=>{const result=await new RulesProvider().recommendFromText("想买 ENHYPEN DESIRE : UNLEASH，尽快发货");expect(result.plans[0].albumId).toBe("enhypen-desire-unleash-make");expect(result.plans[0].reason.length).toBeGreaterThan(5)});
});
