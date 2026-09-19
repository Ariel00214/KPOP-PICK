import Link from "next/link";import type {Album} from "@/lib/types";
export function AlbumCard({album}:{album:Album}){return <Link className="album-card card" href={`/album/${album.id}`}><div className="cover" style={{background:album.accent}}>{album.cover}</div><h3>{album.artist}</h3><p>{album.title}</p><p className="price">{album.lowestPrice?`¥${album.lowestPrice} 起`:"暂无可靠价格"}</p></Link>}
