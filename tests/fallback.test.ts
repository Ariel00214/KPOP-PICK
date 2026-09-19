import{describe,it,expect}from"vitest";import{RulesProvider}from"@/lib/ai";
describe("AI fallback",()=>{it("无模型密钥也可给出规则推荐",async()=>expect(await new RulesProvider().recommend({budget:200,avoidRandom:false,priority:"price"})).toBeTruthy());it("可从文本提取价格",async()=>expect((await new RulesProvider().extract("DEADLINE PINK版 79元")).price).toBe(79))});
