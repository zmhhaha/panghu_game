import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShaPan · 战役指挥所",
  description: "以通信与认知地图为核心的二战战役沙盘"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
