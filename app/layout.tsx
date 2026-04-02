import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Inter, DM_Sans, Plus_Jakarta_Sans, Space_Grotesk, Manrope, Outfit, Sora, Albert_Sans, Instrument_Sans } from "next/font/google";
import "./globals.css";
import SearchModal from "@/components/SearchModal";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const sora = Sora({ subsets: ["latin"], variable: "--font-sora" });
const albertSans = Albert_Sans({ subsets: ["latin"], variable: "--font-albert-sans" });
const instrumentSans = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument-sans" });

const fontVars = [
  GeistSans.variable,
  inter.variable,
  dmSans.variable,
  jakarta.variable,
  spaceGrotesk.variable,
  manrope.variable,
  outfit.variable,
  sora.variable,
  albertSans.variable,
  instrumentSans.variable,
].join(" ");

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
    <html lang="en" className={fontVars}>
      <body className={`${GeistSans.className} antialiased bg-white text-neutral-700`}>
        {children}
        <SearchModal />
      </body>
    </html>
  );
}
