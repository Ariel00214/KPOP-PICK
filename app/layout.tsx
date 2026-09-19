import "./globals.css";
import type { Metadata } from "next";

export const metadata:Metadata={metadataBase:new URL("https://myarea.website"),title:"KPOP PICK",description:"核验 K-pop 专辑官方价格、库存与购买渠道，并按需求获得购买建议。",alternates:{canonical:"/"},openGraph:{title:"KPOP PICK",description:"K-pop 专辑官方价格与购买渠道",url:"https://myarea.website",siteName:"KPOP PICK",locale:"zh_CN",type:"website"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>}
