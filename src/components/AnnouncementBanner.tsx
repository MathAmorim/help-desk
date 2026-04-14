import { getActiveAnnouncements } from "@/app/actions/announcements";
import { AlertTriangle, Megaphone, Info, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AnnouncementBanner() {
    const activeAvisos = await getActiveAnnouncements();
    
    // Filtra apenas os CRÍTICOS para o banner global da dashboard
    const criticalAvisos = activeAvisos.filter((a: any) => a.severity === "CRITICAL");
    
    // Verifica se existem avisos não-críticos para mostrar link para a página de avisos
    const nonCriticalCount = activeAvisos.length - criticalAvisos.length;

    if (activeAvisos.length === 0) return null;

    return (
        <div className="space-y-4 mb-6">
            {criticalAvisos.map((aviso: any) => (
                <div 
                    key={aviso.id}
                    className="group relative overflow-hidden bg-red-600 dark:bg-red-900/40 border border-red-500/50 rounded-lg p-0.5 shadow-lg animate-in slide-in-from-top duration-500"
                >
                    <div className="bg-red-600 dark:bg-transparent px-4 py-3 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-white">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm animate-pulse">
                                <AlertTriangle className="h-5 w-5 text-red-100" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm sm:text-base leading-tight uppercase tracking-tight">ALERTA CRÍTICO: {aviso.title}</h3>
                                <p className="text-red-100/90 text-sm mt-0.5 line-clamp-1">{aviso.content}</p>
                            </div>
                        </div>
                        <Link href="/dashboard/avisos">
                            <Button variant="outline" className="h-9 text-xs border-white/40 bg-white/10 hover:bg-white/20 text-white font-bold whitespace-nowrap transition-all hover:scale-105 active:scale-95">
                                Ver Detalhes
                            </Button>
                        </Link>
                    </div>
                </div>
            ))}

            {nonCriticalCount > 0 && criticalAvisos.length === 0 && (
                <Link href="/dashboard/avisos" className="block group">
                    <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-lg p-3 flex items-center justify-between hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-600 text-white p-2 rounded-full">
                                <Megaphone className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-indigo-900 dark:text-indigo-100">
                                    Existem {nonCriticalCount} novo{nonCriticalCount > 1 ? 's' : ''} comunicado{nonCriticalCount > 1 ? 's' : ''} importante{nonCriticalCount > 1 ? 's' : ''}!
                                </p>
                                <p className="text-xs text-indigo-600 dark:text-indigo-400">Clique aqui para visualizar todos os avisos do sistema.</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                            Acessar →
                        </Button>
                    </div>
                </Link>
            )}
        </div>
    );
}
