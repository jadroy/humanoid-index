import type { Metadata } from "next";
import { Saira, Yrsa } from "next/font/google";
import "./v3.css";

// Thuma's own type family. Saira carries the whole all-sans take.
const saira = Saira({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--v3-sans",
});

// Serif held in reserve — wired but off. Flip --font-display to Yrsa in v3.css
// to A/B the editorial serif on headings without touching any markup.
const yrsa = Yrsa({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--v3-serif",
});

export const metadata: Metadata = {
  title: "Humanoid Index — v3",
  description: "A calm, visual index of humanoid robots.",
};

export default function V3Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${saira.variable} ${yrsa.variable} v3-root`}>{children}</div>
  );
}
