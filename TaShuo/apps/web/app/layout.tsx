import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "它说", description: "从公共信息中拼凑事实" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
