import{describe,expect,it}from"vitest";
import{businessHash,classifyChange,isDue,retryAfterDate,serverBackoffHours}from"../workers/kpop-monitor/src/core";

describe("kpop monitor worker",()=>{
 it("only runs sources when nextCheckAt is due",()=>{const now=new Date("2026-09-20T12:00:00Z");expect(isDue(undefined,now)).toBe(true);expect(isDue({nextCheckAt:"2026-09-20T11:00:00Z"},now)).toBe(true);expect(isDue({nextCheckAt:"2026-09-20T18:00:00Z"},now)).toBe(false)});
 it("backs 5xx off at 1h, 3h, 6h, then 24h",()=>{expect([1,2,3,4,8].map(serverBackoffHours)).toEqual([1,3,6,24,24])});
 it("honors Retry-After without an immediate retry",()=>{expect(retryAfterDate("3600",new Date("2026-09-20T12:00:00Z"))).toBe("2026-09-20T13:00:00.000Z")});
 it("detects only business changes",()=>{const before=[{productId:"1",title:"Album",price:10,currency:"USD",benefit:"card",stock:"InStock",purchaseUrl:"https://example.com/1"}],after=[{...before[0],price:12},{productId:"2",title:"New",price:8,currency:"USD",purchaseUrl:"https://example.com/2"}];expect(classifyChange(before,after).map(v=>v.changeType)).toEqual(["price_changed","new_product"])});
 it("hash ignores presentation fields but tracks offer business fields",async()=>{const base={productId:"1",title:"Old title",price:10,currency:"USD",purchaseUrl:"https://example.com/1"};expect(await businessHash([base])).toBe(await businessHash([{...base,title:"New title"}]));expect(await businessHash([base])).not.toBe(await businessHash([{...base,price:11}]))});
});
