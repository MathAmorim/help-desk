import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Só permite dev origins fora de produção
  ...(process.env.NODE_ENV !== "production" && {
    allowedDevOrigins: ["10.2.1.187"],
  }),

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Anti-Clickjacking: impede incorporação em iframes
          { key: "X-Frame-Options", value: "DENY" },
          // Impede MIME sniffing do navegador
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Controla vazamento de referer
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Proteção XSS legada (navegadores antigos)
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Restringe APIs do navegador não utilizadas
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Força HTTPS por 1 ano (respeitado após primeiro acesso via HTTPS)
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Content Security Policy
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
