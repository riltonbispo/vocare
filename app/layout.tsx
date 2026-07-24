import type { Metadata } from "next";
import { Geist_Mono, Outfit, Raleway } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { QueryProvider } from "@/components/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { AnonymousSessionProvider } from "@/hooks/use-anonymous-session";

const ralewayHeading = Raleway({
  subsets: ["latin"],
  variable: "--font-heading",
});

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" });

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
        geistMono.variable,
        "font-sans",
        outfit.variable,
        ralewayHeading.variable
      )}
    >
      <body className="flex min-h-full flex-col">
        <QueryProvider>
          <AnonymousSessionProvider>
            <SiteHeader />
            <div className="flex-1">{children}</div>
          </AnonymousSessionProvider>
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
