import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LogOut, Home } from "lucide-react";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import NotificationBell from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MobileNav } from "@/components/MobileNav";

function formatShortName(fullName: string | null | undefined): string {
    if (!fullName) return "";
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 1) return fullName;

    const lowerCaseConnectives = ["de", "do", "da", "dos", "das", "e", "del", "di"];
    const firstName = parts[0];
    const secondName = parts[1];

    if (lowerCaseConnectives.includes(secondName.toLowerCase()) && parts.length > 2) {
        return `${firstName} ${secondName} ${parts[2]}`;
    }
    
    return `${firstName} ${secondName}`;
}

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    if ((session.user as any).mustChangePassword) {
        redirect("/trocar-senha");
    }

    return (
        <div className="flex min-h-[100dvh] w-full flex-col">
            <header className="sticky top-0 z-30 flex h-14 sm:h-16 w-full items-center justify-between border-b bg-background px-3 sm:px-6 shadow-sm print:hidden">

                {/* Lado Esquerdo (Menu Hamburguer + Logo + Links Desktop) */}
                <div className="flex items-center gap-2 lg:gap-6 shrink min-w-0">
                    <MobileNav role={session.user.role} />
                    
                    <Link href="/dashboard" className="hidden md:flex items-center gap-1.5 sm:gap-2 font-bold text-lg sm:text-xl tracking-tight mr-0 sm:mr-2 whitespace-nowrap group">
                        <Home className="h-5 w-5 sm:h-6 sm:w-6 text-slate-900 dark:text-slate-100 group-hover:scale-110 transition-transform" />
                        <span className="inline-block">Chamados</span>
                    </Link>

                    {/* Botões padronizados da barra de navegação (Ocultos no Celular e Telas Divididas) */}
                    <nav className="hidden lg:flex items-center gap-1">
                        {session.user.role === "ADMIN" && (
                            <>
                                <Link href="/dashboard/admin" className="px-3 py-1.5 text-sm font-semibold text-amber-600 dark:text-amber-500 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 rounded-md transition-colors whitespace-nowrap">
                                    Painel Admin
                                </Link>
                            </>
                        )}
                        {(session.user.role === "ADMIN" || session.user.role === "SUPORTE") && (
                            <>
                                <Link href="/dashboard/categorias" className="px-3 py-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30 rounded-md transition-colors whitespace-nowrap">
                                    Categorias
                                </Link>
                                <Link href="/dashboard/relatorios" className="px-3 py-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 rounded-md transition-colors whitespace-nowrap">
                                    Relatórios
                                </Link>
                            </>
                        )}
                        {session.user.role === "USUARIO" && (
                            <Link href="/dashboard/meus-relatorios" className="px-3 py-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 rounded-md transition-colors whitespace-nowrap">
                                Meus Relatórios
                            </Link>
                        )}
                        <Link href="/dashboard/avisos" className="px-3 py-1.5 text-sm font-semibold text-orange-600 dark:text-orange-400 hover:bg-orange-100/50 dark:hover:bg-orange-900/30 rounded-md transition-colors whitespace-nowrap">
                            Avisos
                        </Link>
                        <Link href="/dashboard/configuracoes" className="px-3 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 rounded-md transition-colors whitespace-nowrap">
                            Meu Perfil
                        </Link>
                    </nav>
                </div>

                {/* Bloco Central/Dinâmico (Perfil) - Flexiona para ocupar o espaço com segurança */}
                <div className="flex flex-1 items-center justify-center lg:justify-end min-w-0 pr-2 lg:pr-4">
                    <div className="flex flex-col items-center lg:items-end justify-center -space-y-0.5 max-w-[140px] sm:max-w-[180px] flex-shrink px-1">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate w-full text-center lg:text-right" title={session.user.name || undefined}>{formatShortName(session.user.name)}</span>
                        {session.user.funcao && (
                            <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight truncate w-full text-center lg:text-right">{session.user.funcao}</span>
                        )}
                        {session.user.role !== "USUARIO" && (
                            <span className="text-[8px] sm:text-[9px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-extrabold truncate w-full text-center lg:text-right">{session.user.role}</span>
                        )}
                    </div>
                </div>

                {/* Lado Direito (Ícones Fixos) */}
                <div className="flex items-center gap-1 sm:gap-3 border-l border-border pl-2 sm:pl-4 shrink-0">
                    <ThemeToggle />
                    <NotificationBell />
                    <LogoutButton />
                </div>
            </header>
            <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
                {children}
            </main>
        </div>
    );
}
