export async function register(){
 if(process.env.NEXT_RUNTIME==="nodejs"){
  const{startReleaseDiscoveryScheduler}=await import("./lib/release-scheduler");
  startReleaseDiscoveryScheduler();
 }
}
