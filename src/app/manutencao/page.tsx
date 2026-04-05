"use client";

import { Wrench, RefreshCcw, ShieldCheck } from "lucide-react";

export default function MaintenancePage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>

                <div className="relative z-10 flex flex-col items-center">
                    <div className="bg-indigo-100 dark:bg-indigo-900/40 p-4 rounded-full mb-6 animate-pulse">
                        <Wrench className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mb-4">
                        Restauração Técnica em Andamento
                    </h1>
                    
                    <div className="space-y-4 text-slate-600 dark:text-slate-400">
                        <p className="text-sm sm:text-base leading-relaxed">
                            O Portal de Chamados está passando por uma manutenção.
                        </p>
                        
                        <div className="flex flex-col gap-3 py-4">
                            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                                <RefreshCcw className="h-5 w-5 text-indigo-500 shrink-0" />
                                <span className="text-xs font-medium text-left">Atualizando o sistema.</span>
                            </div>
                            
                        </div>

                        <p className="text-xs text-slate-400 italic">
                            O acesso será reestabelecido automaticamente assim que o procedimento for concluído pelo administrador do sistema.
                        </p>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 w-full">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            Acreúna - Help Desk
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
