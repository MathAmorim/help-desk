import { getActiveAnnouncements, getAllAnnouncements } from "@/app/actions/announcements";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, AlertTriangle, Info, Clock, User, Settings2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import NewAnnouncementButton from "@/components/announcements/NewAnnouncementButton";
import DeleteAnnouncementButton from "@/components/announcements/DeleteAnnouncementButton";
import ToggleAnnouncementButton from "@/components/announcements/ToggleAnnouncementButton";

export default async function AnnouncementsPage() {
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === "ADMIN";
    
    // Admins vêem tudo, usuários vêem apenas ativos
    const announcements = isAdmin 
        ? await getAllAnnouncements() 
        : await getActiveAnnouncements();

    function renderSeverityIcon(severity: string) {
        switch (severity) {
            case "INFO": return <Info className="h-5 w-5 text-blue-500" />;
            case "WARNING": return <AlertTriangle className="h-5 w-5 text-amber-500" />;
            case "CRITICAL": return <AlertTriangle className="h-5 w-5 text-red-600" />;
            default: return <Megaphone className="h-5 w-5 text-slate-500" />;
        }
    }

    function renderSeverityBadge(severity: string) {
        switch (severity) {
            case "INFO": return <Badge className="bg-blue-500">Informativo</Badge>;
            case "WARNING": return <Badge className="bg-amber-500">Aviso</Badge>;
            case "CRITICAL": return <Badge className="bg-red-600 animate-pulse">Crítico</Badge>;
            default: return <Badge variant="outline">{severity}</Badge>;
        }
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Megaphone className="h-8 w-8 text-orange-600" />
                        Comunicados do Sistema
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {isAdmin 
                            ? "Gerencie comunicados e avisos técnicos para todos os usuários."
                            : "Fique por dentro de manutenções, problemas técnicos e novidades."
                        }
                    </p>
                </div>
                {isAdmin && <NewAnnouncementButton />}
            </div>

            <div className="grid gap-6">
                {announcements.length === 0 ? (
                    <Card className="border-dashed border-2 py-12">
                        <CardContent className="flex flex-col items-center justify-center text-slate-500">
                            <Megaphone className="h-12 w-12 opacity-10 mb-4" />
                            <p className="text-lg font-medium">Nenhum comunicado no momento.</p>
                            <p className="text-sm">Tudo está operando normalmente.</p>
                        </CardContent>
                    </Card>
                ) : (
                    announcements.map((aviso: any) => (
                        <Card key={aviso.id} className={`overflow-hidden border-l-4 transition-all hover:shadow-md relative ${
                            !aviso.active ? 'opacity-60 grayscale-[0.3] border-l-slate-400' :
                            aviso.severity === 'CRITICAL' ? 'border-l-red-600 bg-red-50/30 dark:bg-red-950/10' : 
                            aviso.severity === 'WARNING' ? 'border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/10' : 
                            'border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/10'
                        }`}>
                            <CardHeader className="pb-3 pr-24">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        {renderSeverityIcon(aviso.severity)}
                                        <CardTitle className="text-xl">{aviso.title}</CardTitle>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {renderSeverityBadge(aviso.severity)}
                                        {!aviso.active && <Badge variant="outline" className="text-slate-500">Inativo</Badge>}
                                        {aviso.expiresAt && new Date(aviso.expiresAt) < new Date() && (
                                            <Badge variant="destructive" className="text-[10px] py-0 h-4">EXPIRADO</Badge>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>

                            {isAdmin && (
                                <div className="absolute top-4 right-4 flex items-center gap-2 bg-white/50 dark:bg-slate-900/50 p-1 rounded-lg backdrop-blur-sm border shadow-sm">
                                    <ToggleAnnouncementButton id={aviso.id} active={aviso.active} />
                                    <DeleteAnnouncementButton id={aviso.id} />
                                </div>
                            )}

                            <CardContent className="space-y-4">
                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                    {aviso.content}
                                </p>
                                
                                <div className="pt-4 border-t flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-500">
                                    <div className="flex items-center gap-1.5">
                                        <User className="h-3.5 w-3.5" />
                                        Postado por: <span className="font-semibold text-slate-700 dark:text-slate-300">{aviso.creator.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5" />
                                        Data: <span className="font-semibold text-slate-700 dark:text-slate-300">{new Date(aviso.createdAt).toLocaleDateString("pt-BR")} às {new Date(aviso.createdAt).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    {isAdmin && aviso.expiresAt && (
                                        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                                            <Clock className="h-3.5 w-3.5" />
                                            Expira em: <span className="font-semibold">{new Date(aviso.expiresAt).toLocaleString("pt-BR")}</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
