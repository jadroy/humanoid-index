import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

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
    <html lang="en">
      <body className={`${GeistMono.className} antialiased bg-white text-gray-900`}>
        {children}
      </body>
    </html>
  );
}
