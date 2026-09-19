import{describe,it,expect}from"vitest";import{safeProperties,allowedEvents}from"@/lib/analytics";
describe("Analytics",()=>{it("包含需求中的核心事件",()=>expect(allowedEvents).toContain("purchase_link_clicked"));it("过滤不必要隐私字段",()=>expect(safeProperties({phone:"1",address:"x",albumId:"a"})).toEqual({albumId:"a"}))});
