"use client";

import { useEffect, useState } from "react";
import { getUserBasicMetrics } from "@/app/actions/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, Activity } from "lucide-react";

export default function MeusRelatoriosPage() {
    const [metrics, setMetrics] = useState<{ totalAbrertosHistorico: number; emAbertoAgora: number } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getUserBasicMetrics()
            .then(data => setMetrics(data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                <p className="text-slate-500 animate-pulse font-medium">Carregando suas estatísticas...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-2">
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Meus Relatórios</h2>
                <p className="text-slate-500 dark:text-slate-400">Acompanhe o histórico e o status atual dos seus chamados.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="relative overflow-hidden group border-none shadow-xl bg-gradient-to-br from-indigo-500 to-indigo-700 dark:from-indigo-600 dark:to-indigo-900 text-white transition-all hover:scale-[1.02] active:scale-[0.98]">
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-lg font-bold">Total de Chamados Abertos</CardTitle>
                        <FileText className="h-6 w-6 text-indigo-100" />
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="text-5xl font-black tracking-tighter">{metrics?.totalAbrertosHistorico}</div>
                        <p className="text-indigo-100/80 text-sm mt-2 font-medium">Quantidade total de solicitações enviadas por você.</p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden group border-none shadow-xl bg-gradient-to-br from-emerald-500 to-emerald-700 dark:from-emerald-600 dark:to-emerald-900 text-white transition-all hover:scale-[1.02] active:scale-[0.98]">
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-lg font-bold">Chamados em Aberto Agora</CardTitle>
                        <Activity className="h-6 w-6 text-emerald-100" />
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="text-5xl font-black tracking-tighter">{metrics?.emAbertoAgora}</div>
                        <p className="text-emerald-100/80 text-sm mt-2 font-medium">Chamados que ainda aguardam resolução pela equipe.</p>
                    </CardContent>
                </Card>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm border-dashed text-center space-y-2">
                <p className="text-slate-600 dark:text-slate-400 text-sm font-semibold italic">"Colocar um texto aqui"</p>
                <p className="text-slate-400 dark:text-slate-500 text-xs">— Equipe de Suporte</p>
            </div>
        </div>
    );
}
