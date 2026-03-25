import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDashboardMetrics } from "@/app/actions/analytics";
import { redirect } from "next/navigation";
import AnalyticsCharts from "./AnalyticsCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileStack, CheckCircle, Star, Trophy, Briefcase, Activity } from "lucide-react";
import PeriodFilter from "./PeriodFilter";

export default async function RelatoriosPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role === "USUARIO") {
        redirect("/dashboard");
    }

    const sp = await searchParams;
    const periodo = sp.periodo || 'tudo';
    const metrics = await getDashboardMetrics(periodo);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-200">Painel de Relatórios Analíticos</h2>
                <PeriodFilter currentPeriod={periodo} />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Chamados Pendentes / Abertos</CardTitle>
                        <FileStack className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-amber-600">{metrics.totalAbertos}</div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">De um total de <span className="text-slate-800 dark:text-slate-200">{metrics.totalCriados}</span> gerados no período.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Chamados Fechados</CardTitle>
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-600">{metrics.totalFechados}</div>
                        <p className="text-xs text-slate-400 mt-1">Atendimentos finalizados com marcação de Resolvido.</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border-indigo-100 dark:border-indigo-900 shadow-sm relative overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold text-indigo-700 dark:text-indigo-400">Destaque do Período 🏆</CardTitle>
                        <Trophy className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        {metrics.tecnicoDestaque ? (
                            <>
                                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1 truncate">{metrics.tecnicoDestaque.name}</div>
                                <div className="flex items-center gap-1 mt-2">
                                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-500">{metrics.tecnicoDestaque.media}</span>
                                    <span className="text-xs text-indigo-500 dark:text-indigo-400 ml-1 font-medium">({metrics.tecnicoDestaque.quantidade} avaliações)</span>
                                </div>
                            </>
                        ) : (
                            <div className="text-sm text-slate-500 dark:text-slate-400 mt-2 italic">Nenhum técnico avaliado neste período.</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="pt-4 pb-2">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b pb-2 mb-4 flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    Meu Desempenho Pessoal
                </h3>
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Meus Pendentes</CardTitle>
                            <Activity className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{metrics.userStats.abertos}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Meus Fechamentos</CardTitle>
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{metrics.userStats.fechados}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Minha Nota Média (CSAT)</CardTitle>
                            <Star className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{metrics.userStats.mediaAvaliacao}</div>
                                {metrics.userStats.mediaAvaliacao > 0 && <Star className="h-5 w-5 fill-amber-500 text-amber-500 -mt-1" />}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="pt-2 pb-8">
                <AnalyticsCharts
                    resolvidosPorTecnico={metrics.resolvidosPorTecnico}
                    abertosPorTecnico={metrics.abertosPorTecnico}
                    avaliacoesPorTecnico={metrics.avaliacoesPorTecnico}
                    chamadosPorSetor={metrics.chamadosPorSetor}
                />
            </div>
        </div>
    );
}
