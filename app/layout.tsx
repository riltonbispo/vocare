import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit, Raleway } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AnonymousSessionBootstrap } from "@/components/anonymous-session-bootstrap";
import { SiteHeader } from "@/components/site-header";

const ralewayHeading = Raleway({
  subsets: ["latin"],
  variable: "--font-heading",
});

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vocare",
  description: "Currículos otimizados para cada oportunidade.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        outfit.variable,
        ralewayHeading.variable
      )}
    >
      <body className="flex min-h-full flex-col">
        <AnonymousSessionBootstrap />
        <SiteHeader />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
