import "./globals.css";
import type { Metadata } from "next";

export const metadata:Metadata={title:"KPOP PICK",description:"K-pop 专辑、小卡、特典与购买渠道聚合决策工具"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>}
