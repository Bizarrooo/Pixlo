import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./pricing-recovery.css";
import "./leaderboard.css";
import "./badge-layout.css";
import "./home-premium.css";
import "./home-performance.css";
import "./home-rebuild.css";
import "./auth-refresh.css";
import "./dashboard-reorg.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  icons: { icon: [{ url: "/pixlo-favicon.svg", type: "image/svg+xml" }], shortcut: "/pixlo-favicon.svg", apple: "/pixlo-favicon.svg" },
  title: "Pixlo",
  description: "Build a profile that feels like you with Pixlo.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}><head><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" /><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&amp;family=Archivo+Black&amp;family=Archivo:wght@400;500;600;700;800&amp;family=Bricolage+Grotesque:wght@400;500;600;700;800&amp;family=DM+Serif+Display&amp;family=Asap:wght@400;500;600;700;800&amp;family=Barlow:wght@400;500;600;700;800&amp;family=Barlow+Condensed:wght@400;500;600;700;800&amp;family=Cabin:wght@400;500;600;700;800&amp;family=Cinzel:wght@400;500;600;700;800&amp;family=Comfortaa:wght@400;500;600;700&amp;family=Exo+2:wght@400;500;600;700;800&amp;family=Figtree:wght@400;500;600;700;800&amp;family=IBM+Plex+Mono:wght@400;500;600;700&amp;family=IBM+Plex+Serif:wght@400;500;600;700&amp;family=IBM+Plex+Sans:wght@400;500;600;700&amp;family=Josefin+Sans:wght@400;500;600;700&amp;family=Jost:wght@400;500;600;700;800&amp;family=Karla:wght@400;500;600;700;800&amp;family=Lato:wght@400;700;900&amp;family=Lexend:wght@400;500;600;700;800&amp;family=Libre+Franklin:wght@400;500;600;700;800&amp;family=Lora:wght@400;500;600;700&amp;family=Merriweather:wght@400;700;900&amp;family=Mulish:wght@400;500;600;700;800&amp;family=Nunito:wght@400;500;600;700;800&amp;family=Nunito+Sans:wght@400;500;600;700;800&amp;family=Onest:wght@400;500;600;700;800&amp;family=Oxygen:wght@400;700&amp;family=Roboto:wght@400;500;700;900&amp;family=Roboto+Condensed:wght@400;500;700;800&amp;family=Righteous&amp;family=Space+Mono:wght@400;700&amp;family=Titillium+Web:wght@400;600;700&amp;family=Source+Code+Pro:wght@400;500;600;700&amp;family=Source+Sans+3:wght@400;500;600;700;800&amp;family=Sora:wght@400;500;600;700;800&amp;family=Spectral:wght@400;500;600;700;800&amp;family=Ubuntu:wght@400;500;700&amp;family=Urbanist:wght@400;500;600;700;800&amp;family=Yeseva+One&amp;family=Zilla+Slab:wght@400;500;600;700&amp;family=Work+Sans:wght@400;500;600;700;800&amp;display=swap" /></head><body>{children}</body></html>;
}
