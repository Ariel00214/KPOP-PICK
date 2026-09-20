import {normalizeAlias} from "./artist-alias";

type ItunesResult={artistName?:string;collectionName?:string;artworkUrl100?:string};
function albumKey(value:string){return normalizeAlias(value.replace(/\([^)]*\)|\[[^\]]*\]/g,""))}

export async function findOfficialAlbumArtwork(artist:string,title:string,timeoutMs=3500){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const term=encodeURIComponent(`${artist} ${title}`);const response=await fetch(`https://itunes.apple.com/search?term=${term}&entity=album&limit=12`,{signal:controller.signal,headers:{accept:"application/json"}});
  if(!response.ok)return null;const body=await response.json()as{results?:ItunesResult[]};const artistKey=normalizeAlias(artist),titleKey=albumKey(title);
  const match=(body.results||[]).find(item=>normalizeAlias(item.artistName||"")===artistKey&&(()=>{const candidate=albumKey(item.collectionName||"");return candidate===titleKey||candidate.startsWith(titleKey)||titleKey.startsWith(candidate)})());
  return match?.artworkUrl100?.replace(/100x100bb/,"600x600bb")||null;
 }catch{return null}finally{clearTimeout(timer)}
}
