import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { GeistPixelSquare, GeistPixelGrid, GeistPixelCircle, GeistPixelTriangle, GeistPixelLine } from "geist/font/pixel";
import {
  Inter,
  B612,
  B612_Mono,
  Space_Mono,
  JetBrains_Mono,
  IBM_Plex_Sans,
  IBM_Plex_Mono,
  Azeret_Mono,
  Chivo_Mono,
  Fira_Code,
  Orbitron,
  Chakra_Petch,
  Oxanium,
  Rajdhani,
  Exo_2,
  Michroma,
  Major_Mono_Display,
  Tektur,
  Anta,
  Syne,
  Mona_Sans,
  Albert_Sans,
  Fustat,
  Nunito_Sans,
  Plus_Jakarta_Sans,
  Open_Sans,
} from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import SearchModal from "@/components/SearchModal";
import DevAnnotate from "@/components/DevAnnotate";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const b612 = B612({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-b612" });
const b612Mono = B612_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-b612-mono" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });
const ibmPlexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-ibm-plex-sans" });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-ibm-plex-mono" });
const azeretMono = Azeret_Mono({ subsets: ["latin"], variable: "--font-azeret-mono" });
const chivoMono = Chivo_Mono({ subsets: ["latin"], variable: "--font-chivo-mono" });
const firaCode = Fira_Code({ subsets: ["latin"], variable: "--font-fira-code" });
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" });
const chakraPetch = Chakra_Petch({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-chakra-petch" });
const oxanium = Oxanium({ subsets: ["latin"], variable: "--font-oxanium" });
const rajdhani = Rajdhani({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-rajdhani" });
const exo2 = Exo_2({ subsets: ["latin"], variable: "--font-exo-2" });
const michroma = Michroma({ subsets: ["latin"], weight: "400", variable: "--font-michroma" });
const majorMono = Major_Mono_Display({ subsets: ["latin"], weight: "400", variable: "--font-major-mono" });
const tektur = Tektur({ subsets: ["latin"], variable: "--font-tektur" });
const anta = Anta({ subsets: ["latin"], weight: "400", variable: "--font-anta" });
const syne = Syne({ subsets: ["latin"], variable: "--font-syne" });
const monaSans = Mona_Sans({ subsets: ["latin"], variable: "--font-mona-sans" });
const albertSans = Albert_Sans({ subsets: ["latin"], variable: "--font-albert-sans" });
const fustat = Fustat({ subsets: ["latin"], variable: "--font-fustat" });
const nunitoSans = Nunito_Sans({ subsets: ["latin"], variable: "--font-nunito-sans" });
const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-plus-jakarta-sans" });
const openSans = Open_Sans({ subsets: ["latin"], variable: "--font-open-sans" });

const fontVars = [
  GeistSans.variable,
  GeistMono.variable,
  GeistPixelSquare.variable,
  GeistPixelGrid.variable,
  GeistPixelCircle.variable,
  GeistPixelTriangle.variable,
  GeistPixelLine.variable,
  inter.variable,
  b612.variable,
  b612Mono.variable,
  spaceMono.variable,
  jetbrainsMono.variable,
  ibmPlexSans.variable,
  ibmPlexMono.variable,
  azeretMono.variable,
  chivoMono.variable,
  firaCode.variable,
  orbitron.variable,
  chakraPetch.variable,
  oxanium.variable,
  rajdhani.variable,
  exo2.variable,
  michroma.variable,
  majorMono.variable,
  tektur.variable,
  anta.variable,
  syne.variable,
  monaSans.variable,
  albertSans.variable,
  fustat.variable,
  nunitoSans.variable,
  plusJakartaSans.variable,
  openSans.variable,
].join(" ");

export const metadata: Metadata = {
  title: "Humanoid Index",
  description: "A comprehensive index of humanoid robots",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
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
        {process.env.NODE_ENV === "development" && <DevAnnotate />}
        <Analytics />
      </body>
    </html>
  );
}
