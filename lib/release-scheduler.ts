import {defaultDiscoveryService,parseInterval} from "./release-discovery";
import {prisma} from "./prisma";

declare global{var __kpopReleaseTimer:ReturnType<typeof setInterval>|undefined}
export function startReleaseDiscoveryScheduler(){
 if(globalThis.__kpopReleaseTimer||process.env.RELEASE_DISCOVERY_ENABLED==="false")return;
 let running=false;
 const run=async()=>{if(running)return;running=true;try{const last=await prisma.systemMetric.findFirst({where:{metricName:"release_discovery_completed"},orderBy:{createdAt:"desc"}});if(last&&Date.now()-last.createdAt.getTime()<parseInterval())return;const service=defaultDiscoveryService();if(process.env.RELEASE_DISCOVERY_FEED_URL)await service.discover();const artists=await prisma.artist.findMany({select:{name:true},take:100,orderBy:{name:"asc"}});for(const artist of artists)await service.discover(artist.name);await prisma.systemMetric.create({data:{metricName:"release_discovery_completed",value:artists.length,unit:"artists"}})}catch{console.error("Scheduled discovery unavailable")}finally{running=false}};
 globalThis.__kpopReleaseTimer=setInterval(run,parseInterval());globalThis.__kpopReleaseTimer.unref();
 setTimeout(run,15_000).unref();
}
