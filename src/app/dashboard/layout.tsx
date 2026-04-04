import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LogOut, Home } from "lucide-react";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import NotificationBell from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";

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
        <div className="flex min-h-screen w-full flex-col">
            <header className="sticky top-0 z-30 flex h-auto sm:h-16 flex-col sm:flex-row items-center justify-between border-b bg-background px-4 sm:px-6 py-2 sm:py-0 shadow-sm gap-2 sm:gap-0 print:hidden">

                {/* Lado Esquerdo (Logo + Links da Navegação) */}
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 w-full sm:w-auto">
                    <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl tracking-tight mr-2 whitespace-nowrap group">
                        <Home className="h-6 w-6 text-slate-900 dark:text-slate-100 group-hover:scale-110 transition-transform" />
                        <span className="inline-block">Chamados</span>
                    </Link>

                    {/* Botões padronizados da barra de navegação */}
                    <nav className="flex items-center gap-1 overflow-x-auto max-w-full no-scrollbar">
                        {session.user.role === "ADMIN" && (
                            <Link href="/dashboard/admin" className="px-3 py-1.5 text-sm font-semibold text-amber-600 dark:text-amber-500 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 rounded-md transition-colors whitespace-nowrap">
                                Painel Admin
                            </Link>
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
                        <Link href="/dashboard/configuracoes" className="px-3 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 rounded-md transition-colors whitespace-nowrap">
                            Configurações
                        </Link>
                    </nav>
                </div>

                {/* Lado Direito (Perfil, Notificações e Sair) */}
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-0 pt-2 sm:pt-0">
                    <div className="flex flex-col items-center justify-center -space-y-0.5">
                        <span className="font-medium text-sm text-slate-800 dark:text-slate-200">{session.user.name}</span>
                        {session.user.role !== "USUARIO" && (
                            <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">{session.user.role}</span>
                        )}
                    </div>

                    <div className="flex items-center gap-3 border-l border-border pl-4 ml-2">
                        <ThemeToggle />
                        <NotificationBell />
                        <LogoutButton />
                    </div>
                </div>
            </header>
            <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
                {children}
            </main>
        </div>
    );
}
