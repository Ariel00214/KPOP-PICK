import {normalizeAlias} from "./artist-alias";

type ItunesResult={artistName?:string;collectionName?:string;artworkUrl100?:string;collectionId?:number;releaseDate?:string;collectionType?:string;trackCount?:number};
export type AppleAlbumMetadata={appleMusicId:string;title:string;coverImageUrl:string|null;releaseDate:string|null;albumType:string|null;trackCount:number|null};
function albumKey(value:string){return normalizeAlias(value.replace(/\([^)]*\)|\[[^\]]*\]/g,""))}

export async function findAppleAlbumMetadata(artist:string,title:string,releaseDate?:string,timeoutMs=3500):Promise<AppleAlbumMetadata|null>{
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const term=encodeURIComponent(`${artist} ${title}`);const response=await fetch(`https://itunes.apple.com/search?term=${term}&entity=album&country=us&limit=12`,{signal:controller.signal,headers:{accept:"application/json"}});
  if(!response.ok)return null;const body=await response.json()as{results?:ItunesResult[]};const artistKey=normalizeAlias(artist),titleKey=albumKey(title);
  const match=(body.results||[]).find(item=>normalizeAlias(item.artistName||"")===artistKey&&(()=>{const candidate=albumKey(item.collectionName||"");if(!(candidate===titleKey||candidate.startsWith(titleKey)||titleKey.startsWith(candidate)))return false;if(!releaseDate||!item.releaseDate)return true;return Math.abs(new Date(item.releaseDate).getTime()-new Date(releaseDate).getTime())<=45*864e5})());
  if(!match?.collectionId||!match.collectionName)return null;return{appleMusicId:String(match.collectionId),title:match.collectionName,coverImageUrl:match.artworkUrl100?.replace(/100x100bb/,"600x600bb")||null,releaseDate:match.releaseDate?.slice(0,10)||null,albumType:match.collectionType||null,trackCount:Number.isInteger(match.trackCount)?match.trackCount!:null};
 }catch{return null}finally{clearTimeout(timer)}
}
export async function findOfficialAlbumArtwork(artist:string,title:string,timeoutMs=3500){return(await findAppleAlbumMetadata(artist,title,undefined,timeoutMs))?.coverImageUrl||null}
