import{describe,expect,it}from"vitest";import{evaluateReleaseFacts}from"@/lib/release-verification";import{millisecondsUntil23Shanghai}from"@/lib/release-scheduler";
const complete={artistName:"Generic Artist",albumName:"Original Title",releaseType:"MINI_ALBUM",releaseDate:"2026-10-06"};
describe("release verification MVP",()=>{
 it("confirms a formal release with an exact date and official evidence",()=>expect(evaluateReleaseFacts(complete,true).status).toBe("CONFIRMED"));
 it("keeps month-only announcements pending",()=>expect(evaluateReleaseFacts({...complete,releaseDate:"October"},true)).toMatchObject({status:"PENDING",missing:["release_date"]}));
 it("keeps coming-soon announcements pending",()=>expect(evaluateReleaseFacts({...complete,releaseDate:null},true).status).toBe("PENDING"));
 it("never treats a fan source as official confirmation",()=>expect(evaluateReleaseFacts(complete,false)).toMatchObject({status:"PENDING",missing:["official_source"]}));
 it("rejects non-music events from confirmation",()=>expect(evaluateReleaseFacts({...complete,releaseType:"FAN_MEETING"},true).status).toBe("PENDING"));
 it("does not require cover, PB, versions, prices or channels",()=>expect(evaluateReleaseFacts(complete,true).status).toBe("CONFIRMED"));
 it("is artist agnostic",()=>expect(evaluateReleaseFacts({...complete,artistName:"任意艺人"},true).status).toBe("CONFIRMED"));
 it("schedules 23:00 Asia/Shanghai exactly",()=>expect(millisecondsUntil23Shanghai(new Date("2026-09-20T14:59:00Z"))).toBe(60_000));
});
