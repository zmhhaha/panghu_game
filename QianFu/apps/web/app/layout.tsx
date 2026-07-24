import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "潜线", description: "潜伏类多 Agent 谍战游戏" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body className="font-sans">{children}</body></html>;
}
