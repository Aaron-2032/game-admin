import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "大地遊戲管理系統",
  description: "大地遊戲金流管理平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className="h-full">
      <body className="min-h-full bg-gray-950 text-gray-100 antialiased">{children}</body>
    </html>
  );
}
