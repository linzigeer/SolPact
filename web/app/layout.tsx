import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/providers";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "SolPact — Agree. Deliver. Get paid.",
  description:
    "面向跨境团队的 Solana 里程碑 USDC 托管与结算平台。约定清楚，交付有据，结算有序。支持真实项目创建、入金、交付、验收、退款与争议仲裁。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-primary-950 text-primary-200`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
