import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

import { Providers } from "@/components/Providers";
import { Toaster } from "@/components/ui/sonner";

export const viewport = {
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "Portal de Chamados",
  description: "Sistema para abertura e gerenciamento de chamados da Prefeitura Municipal de Acreúna.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Portal de Chamados",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${inter.className} antialiased min-h-[100dvh]`}
      >
        <Providers>{children}</Providers>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
