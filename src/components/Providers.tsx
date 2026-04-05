"use client";

import { SessionProvider } from "next-auth/react";

import { ThemeProvider } from "next-themes";
import { usePathname } from "next/navigation";

export function Providers({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const forceLight = pathname === "/login" || pathname === "/trocar-senha";

    return (
        <SessionProvider>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem={false} // Evita injeção de script que causa erro no React 19
                disableTransitionOnChange
                forcedTheme={forceLight ? "light" : undefined}
            >
                {children}
            </ThemeProvider>
        </SessionProvider>
    );
}
