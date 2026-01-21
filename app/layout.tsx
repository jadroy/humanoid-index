import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import SearchModal from "@/components/SearchModal";

export const metadata: Metadata = {
  title: "Humanoid Index",
  description: "A comprehensive index of humanoid robots",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body className={`${GeistMono.className} antialiased bg-white text-gray-900`}>
        {children}
        <SearchModal />
      </body>
    </html>
  );
}
