"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Home, Shield, Tags, PieChart, Megaphone, User, ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MobileNav({ role }: { role: string }) {
    const [isOpen, setIsOpen] = useState(false);

    const closeMenu = () => setIsOpen(false);

    return (
        <div className="flex lg:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)} className="h-10 w-10 shrink-0 text-slate-700 dark:text-slate-300">
                <Menu className="h-6 w-6" />
            </Button>

            {isOpen && (
                <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 px-6 pt-20 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
                    <Button variant="ghost" size="icon" onClick={closeMenu} className="absolute top-4 right-4 h-12 w-12 text-slate-700 dark:text-slate-300">
                        <X className="h-8 w-8" />
                    </Button>
                    <div className="border-b pb-4 mb-4 dark:border-slate-800">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Menu</h2>
                    </div>
                    <nav className="flex flex-col gap-3 text-left">
                        <Link href="/dashboard" onClick={closeMenu} className="flex items-center gap-3 text-lg font-bold p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-500 rounded-xl hover:bg-blue-100 transition-colors">
                            <Home className="h-5 w-5 opacity-80" />
                            <span>Chamados</span>
                        </Link>
                        {(role === "ADMIN" || role === "SUPORTE") && (
                            <Link href="/dashboard/todos" onClick={closeMenu} className="flex items-center gap-3 text-lg font-bold p-3 bg-cyan-50 dark:bg-cyan-950/20 text-cyan-700 dark:text-cyan-400 rounded-xl hover:bg-cyan-100 transition-colors">
                                <ListFilter className="h-5 w-5 opacity-80" />
                                <span>Todos os Chamados</span>
                            </Link>
                        )}
                        {role === "ADMIN" && (
                            <Link href="/dashboard/admin" onClick={closeMenu} className="flex items-center gap-3 text-lg font-bold p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-500 rounded-xl hover:bg-amber-100 transition-colors">
                                <Shield className="h-5 w-5 opacity-80" />
                                <span>Painel Admin</span>
                            </Link>
                        )}
                        {(role === "ADMIN" || role === "SUPORTE") && (
                            <>
                                <Link href="/dashboard/categorias" onClick={closeMenu} className="flex items-center gap-3 text-lg font-bold p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 transition-colors">
                                    <Tags className="h-5 w-5 opacity-80" />
                                    <span>Categorias</span>
                                </Link>
                                <Link href="/dashboard/relatorios" onClick={closeMenu} className="flex items-center gap-3 text-lg font-bold p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 transition-colors">
                                    <PieChart className="h-5 w-5 opacity-80" />
                                    <span>Relatórios</span>
                                </Link>
                            </>
                        )}
                        {role === "USUARIO" && (
                            <Link href="/dashboard/meus-relatorios" onClick={closeMenu} className="flex items-center gap-3 text-lg font-bold p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 transition-colors">
                                <PieChart className="h-5 w-5 opacity-80" />
                                <span>Meus Relatórios</span>
                            </Link>
                        )}
                        <Link href="/dashboard/avisos" onClick={closeMenu} className="flex items-center gap-3 text-lg font-bold p-3 bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-500 rounded-xl hover:bg-orange-100 transition-colors">
                            <Megaphone className="h-5 w-5 opacity-80" />
                            <span>Avisos</span>
                        </Link>
                        <Link href="/dashboard/configuracoes" onClick={closeMenu} className="flex items-center gap-3 text-lg font-bold p-3 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 transition-colors">
                            <User className="h-5 w-5 opacity-80" />
                            <span>Meu Perfil</span>
                        </Link>
                    </nav>
                </div>
            )}
        </div>
    );
}
