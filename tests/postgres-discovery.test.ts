// @vitest-environment node
import {describe,it,expect} from "vitest";
import {prisma} from "@/lib/prisma";
import {getAlbums} from "@/lib/catalog";
import {normalizeAlias} from "@/lib/artist-alias";
import {cache} from "@/lib/cache";
import {ReleaseDiscoveryService,PrismaDiscoveryRepository,type DiscoveredRelease} from "@/lib/release-discovery";
describe.skipIf(process.env.RUN_DATABASE_TESTS!=="true")("PostgreSQL discovery integration",()=>{
 it("resolves aliases, persists candidates, verifies atomically and invalidates empty search cache",async()=>{
  const aliases=["YESUNG","艺声","金钟云","예성"];
  const artist=await prisma.artist.upsert({where:{name:"YESUNG"},update:{},create:{name:"YESUNG"}});
  await prisma.artistAlias.createMany({data:aliases.map(alias=>({alias,artistId:artist.id,aliasType:"COMMON_ALIAS",normalizedAlias:normalizeAlias(alias)})),skipDuplicates:true});
  for(const alias of aliases){const resolved=await prisma.artistAlias.findFirstOrThrow({where:{normalizedAlias:normalizeAlias(alias)}});expect(resolved.artistId).toBe(artist.id);expect(await getAlbums(alias,true)).toEqual([])}
  cache.set("search:yesung",[],60_000);
  const fixture:DiscoveredRelease={artistName:"YESUNG",artistAliases:aliases,albumName:"Where We Are",releaseDate:"2026-10-06",releaseType:"ALBUM",sourceUrl:"https://fixture-a.example/the-2nd-album",sourceName:"The 2nd Album announcement fixture",confidence:1};
  const service=new ReleaseDiscoveryService([{name:"Fixture A",trusted:true,discover:async()=>[fixture]}],new PrismaDiscoveryRepository());
  const found=await service.discover("YESUNG",new Date("2026-09-19"));expect(found.candidates[0].status).toBe("NEEDS_REVIEW");expect(await prisma.album.count({where:{artistId:artist.id}})).toBe(0);expect(await prisma.releaseEvidence.count({where:{candidateId:found.candidates[0].id,isOfficial:true}})).toBe(1);
  const same=await new PrismaDiscoveryRepository().saveCandidate({...fixture,sourceUrl:"https://fixture-b.example/the-2nd-album",isOfficial:true,origin:"USER_SUBMISSION"},"NEEDS_REVIEW",[{...fixture,sourceUrl:"https://fixture-b.example/the-2nd-album",isOfficial:true}]);expect(same.id).toBe(found.candidates[0].id);expect(await prisma.releaseEvidence.count({where:{candidateId:same.id}})).toBe(2);
  const verified=await service.verify(found.candidates[0]);expect(cache.has("search:yesung")).toBe(false);
  for(const alias of aliases){const albums=await getAlbums(alias,true);expect(albums[0].id).toBe(verified.albumId);expect(albums[0].offers).toEqual([])}
  const again=await service.verify(found.candidates[0]);expect(again.albumId).toBe(verified.albumId);expect(await prisma.album.count({where:{artistId:artist.id}})).toBe(1);
  cache.set("search:yesung",[],60_000);await prisma.albumVersion.create({data:{albumId:verified.albumId,name:"Fixture CD",packageType:"CD"}});expect(cache.has("search:yesung")).toBe(false);
 });
});
