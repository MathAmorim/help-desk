import type { Metadata } from "next";
import "./globals.css";

import { Providers } from "@/components/Providers";
import { Toaster } from "@/components/ui/sonner";

export const viewport = {
  themeColor: "#000000",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://suporteti.playit.plus"),
  title: "Portal de Chamados",
  description: "Sistema para abertura e gerenciamento de chamados da Prefeitura Municipal de Acreúna.",
  manifest: "/manifest.json",
  openGraph: {
    title: "Portal de Chamados - Suporte TI",
    description: "Abra e acompanhe seus chamados de suporte técnico de forma rápida e segura.",
    url: "https://suporteti.playit.plus",
    siteName: "Portal de Chamados Acreúna",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Portal de Chamados - Prefeitura de Acreúna",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Portal de Chamados",
    description: "Gerenciamento de chamados de suporte técnico.",
    images: ["/og-image.png"],
  },
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
        className="antialiased min-h-[100dvh]"
        style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
      >
        <Providers>{children}</Providers>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
