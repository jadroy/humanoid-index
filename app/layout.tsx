import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Inter, DM_Sans, Plus_Jakarta_Sans, Space_Grotesk, Manrope, Outfit, Sora, Albert_Sans, Instrument_Sans, Rubik, Nunito_Sans, Work_Sans, Poppins, Raleway, Figtree, Karla, Lexend, Red_Hat_Display, Archivo, Be_Vietnam_Pro, Urbanist, Jost, Quicksand, Cabin, Bricolage_Grotesque, Onest, Wix_Madefor_Display, Gabarito, Noto_Sans, Schibsted_Grotesk } from "next/font/google";
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
const rubik = Rubik({ subsets: ["latin"], variable: "--font-rubik" });
const nunitoSans = Nunito_Sans({ subsets: ["latin"], variable: "--font-nunito-sans" });
const workSans = Work_Sans({ subsets: ["latin"], variable: "--font-work-sans" });
const poppins = Poppins({ subsets: ["latin"], variable: "--font-poppins", weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"] });
const raleway = Raleway({ subsets: ["latin"], variable: "--font-raleway" });
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });
const karla = Karla({ subsets: ["latin"], variable: "--font-karla" });
const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend" });
const redHatDisplay = Red_Hat_Display({ subsets: ["latin"], variable: "--font-red-hat-display" });
const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo" });
const beVietnamPro = Be_Vietnam_Pro({ subsets: ["latin"], variable: "--font-be-vietnam-pro", weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"] });
const urbanist = Urbanist({ subsets: ["latin"], variable: "--font-urbanist" });
const jost = Jost({ subsets: ["latin"], variable: "--font-jost" });
const quicksand = Quicksand({ subsets: ["latin"], variable: "--font-quicksand" });
const cabin = Cabin({ subsets: ["latin"], variable: "--font-cabin" });
const bricolageGrotesque = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage-grotesque" });
const onest = Onest({ subsets: ["latin"], variable: "--font-onest" });
const wixMadefor = Wix_Madefor_Display({ subsets: ["latin"], variable: "--font-wix-madefor" });
const gabarito = Gabarito({ subsets: ["latin"], variable: "--font-gabarito" });
const notoSans = Noto_Sans({ subsets: ["latin"], variable: "--font-noto-sans" });
const schibstedGrotesk = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-schibsted-grotesk" });

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
  rubik.variable,
  nunitoSans.variable,
  workSans.variable,
  poppins.variable,
  raleway.variable,
  figtree.variable,
  karla.variable,
  lexend.variable,
  redHatDisplay.variable,
  archivo.variable,
  beVietnamPro.variable,
  urbanist.variable,
  jost.variable,
  quicksand.variable,
  cabin.variable,
  bricolageGrotesque.variable,
  onest.variable,
  wixMadefor.variable,
  gabarito.variable,
  notoSans.variable,
  schibstedGrotesk.variable,
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
