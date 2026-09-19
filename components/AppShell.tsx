"use client";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {useEffect,useState} from "react";
import {Home,Search,GalleryVerticalEnd,Heart,UserRound} from "lucide-react";

const nav=[["/home","首页",Home],["/search","找专辑",Search],["/photocards","小卡",GalleryVerticalEnd],["/favorites","收藏",Heart],["/profile","我的",UserRound]] as const;
export function AppShell({children,plain=false}:{children:React.ReactNode;plain?:boolean}){
 const path=usePathname(),router=useRouter();
 const [mode,setMode]=useState("beginner");
 useEffect(()=>setMode(localStorage.getItem("kpop-mode")||"beginner"),[]);
 const switchMode=()=>{const next=mode==="beginner"?"expert":"beginner";localStorage.setItem("kpop-mode",next);setMode(next);void fetch("/api/analytics",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({eventName:"mode_switched",properties:{mode:next}})});router.refresh()};
 return <main className="app">{!plain&&<header className="topbar"><Link className="brand" href="/home">KPOP PICK</Link><button className="mode" onClick={switchMode}>{mode==="beginner"?"🌱 新手模式":"🎴 老手模式"}⌄</button></header>}{children}{!plain&&<nav className="bottomnav">{nav.map(([href,label,Icon])=><Link key={href} href={href} className={path.startsWith(href)?"active":""}><Icon/><span>{label}</span></Link>)}</nav>}</main>
}
