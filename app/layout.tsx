import type { Metadata } from "next";
import { Noto_Sans_SC } from "next/font/google";
import "./globals.css";

const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "NYU Tandon CSSA 2026 非诚勿扰 | 嘉宾报名",
  description: "NYU Tandon CSSA 2026 非诚勿扰活动嘉宾报名系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${notoSansSC.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
