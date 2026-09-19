import {describe,it,expect} from "vitest";
import {withTimeout,ReleaseDiscoveryService,type ReleaseSourceProvider,type DiscoveryRepository} from "@/lib/release-discovery";
import {validAdminToken,adminToken} from "@/lib/admin-session";
describe("discovery safety",()=>{
 it("terminates a provider ignoring its abort signal",async()=>{await expect(withTimeout(()=>new Promise(()=>{}),5)).rejects.toThrow("Provider timeout")});
 it("rejects the legacy forged admin cookie",()=>{expect(validAdminToken("1")).toBe(false)});
 it("validates signed expiring admin credentials",()=>{const old=process.env.ADMIN_PASSWORD;process.env.ADMIN_PASSWORD="test-only-secret";try{const token=adminToken();expect(validAdminToken(token)).toBe(true);expect(validAdminToken(token+"bad")).toBe(false)}finally{if(old===undefined)delete process.env.ADMIN_PASSWORD;else process.env.ADMIN_PASSWORD=old}});
 it("does not count two providers on the same source domain as independent",async()=>{
  const row={artistName:"YESUNG",artistAliases:[],albumName:"Where We Are",releaseDate:"2026-10-06",releaseType:"ALBUM",sourceUrl:"https://same.example/announcement",sourceName:"Example",confidence:1};
  const providers:ReleaseSourceProvider[]=["A","B"].map(name=>({name,trusted:true,discover:async()=>[row]}));
  const repo:DiscoveryRepository={findAlbum:async()=>null,saveCandidate:async(release,status)=>({...release,id:"test",status}),verifyCandidate:async()=>{throw new Error("must not verify")}};
  const result=await new ReleaseDiscoveryService(providers,repo).discover("YESUNG",new Date("2026-09-19"));expect(result.candidates[0].status).toBe("DISCOVERED");
 });
});
