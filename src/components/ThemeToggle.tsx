"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { updateTheme as updateThemeAction } from "@/app/actions/profile";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const sessionContext = useSession();
    
    // Fallback caso o provider falhe na hidratação
    const session = sessionContext?.data;
    const update = sessionContext?.update;

    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    // Sincroniza o tema do Banco de Dados para o next-themes no primeiro carregamento
    React.useEffect(() => {
        if (mounted && session?.user && (session.user as any).theme) {
            const userTheme = (session.user as any).theme;
            if (theme !== userTheme) {
                setTheme(userTheme);
            }
        }
    }, [mounted, session]);

    if (!mounted) {
        return (
            <div className="w-8 h-8" />
        );
    }

    const handleThemeChange = async () => {
        const newTheme = theme === "dark" ? "light" : "dark";
        setTheme(newTheme);

        try {
            await updateThemeAction(newTheme);
            await update({ theme: newTheme });
        } catch (error) {
            console.error("Erro ao salvar tema:", error);
        }
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleThemeChange}
            className="w-8 h-8 rounded-full"
            title="Alternar Modo Escuro (Salvo na Conta)"
        >
            {theme === "dark" ? (
                <Sun className="h-5 w-5 text-amber-400" />
            ) : (
                <Moon className="h-5 w-5 text-indigo-600" />
            )}
            <span className="sr-only">Alternar tema</span>
        </Button>
    );
}
