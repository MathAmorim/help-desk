"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Hash, User, Activity, Clock, Info, ExternalLink } from "lucide-react";
import Link from "next/link";

interface AuditLogTableProps {
    logs: any[];
    total: number;
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    isLoading: boolean;
}

export default function AuditLogTable({ logs, total, page, totalPages, onPageChange, isLoading }: AuditLogTableProps) {
    
    const getActionColor = (acao: string) => {
        switch (acao) {
            case "ABERTURA": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
            case "RESOLUCAO": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
            case "FECHAMENTO": return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400";
            case "LOGIN_FAILED": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
            case "ROLE_CHANGE": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
            case "USUARIO_DESATIVADO": return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
            case "USUARIO_REATIVADO": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
            default: return "bg-slate-100 text-slate-700";
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4 border rounded-xl bg-white dark:bg-slate-900">
                <Activity className="h-10 w-10 text-indigo-500 animate-pulse" />
                <p className="text-slate-500 animate-pulse font-medium">Consultando registros...</p>
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-2 border rounded-xl bg-white dark:bg-slate-900">
                <Info className="h-10 w-10 text-slate-300" />
                <p className="text-slate-900 dark:text-slate-100 font-bold">Nenhum registro encontrado.</p>
                <p className="text-slate-500 text-sm">Tente ajustar os filtros de busca.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 border rounded-xl overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                        <TableRow>
                            <TableHead className="w-[180px]"><Clock className="h-3.5 w-3.5 inline mr-1" /> Data / Hora</TableHead>
                            <TableHead className="w-[150px]"><User className="h-3.5 w-3.5 inline mr-1" /> Ator</TableHead>
                            <TableHead className="w-[150px]"><Activity className="h-3.5 w-3.5 inline mr-1" /> Ação</TableHead>
                            <TableHead className="w-[120px]"><Hash className="h-3.5 w-3.5 inline mr-1" /> Alvo</TableHead>
                            <TableHead>Detalhes da Operação</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.map((log) => (
                            <TableRow key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors border-b last:border-0">
                                <TableCell className="text-xs font-mono text-slate-500">
                                    {new Intl.DateTimeFormat("pt-BR", { 
                                        day: "2-digit", 
                                        month: "2-digit", 
                                        year: "numeric", 
                                        hour: "2-digit", 
                                        minute: "2-digit", 
                                        second: "2-digit" 
                                    }).format(new Date(log.createdAt))}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{log.user?.name || "Sistema"}</span>
                                        <span className="text-[10px] text-slate-500 uppercase tracking-tighter">{log.user?.role || "SYSTEM"}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={`${getActionColor(log.acao)} border-none text-[10px] uppercase font-black px-2 py-0.5`}>
                                        {log.acao.replace("_", " ")}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {log.ticketId ? (
                                        <Link 
                                            href={`/dashboard/ticket/${log.ticketId}`}
                                            className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 text-xs font-mono font-bold flex items-center gap-1 group"
                                        >
                                            #{log.ticketId.substring(log.ticketId.length - 6).toUpperCase()}
                                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </Link>
                                    ) : (
                                        <span className="text-slate-400 font-mono text-xs">-</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-sm text-slate-600 dark:text-slate-400 max-w-md truncate" title={log.detalhes}>
                                    {log.detalhes}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between px-2">
                <div className="text-sm text-slate-500">
                    Página <span className="font-bold text-slate-900 dark:text-slate-100">{page}</span> de <span className="font-bold text-slate-900 dark:text-slate-100">{totalPages}</span>
                    <span className="mx-2">•</span>
                    Total de <span className="font-bold text-slate-900 dark:text-slate-100">{total}</span> registros
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={page === 1}
                        onClick={() => onPageChange(page - 1)}
                        className="h-9 px-3 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-900 font-bold transition-all hover:scale-105 active:scale-95 shadow-sm disabled:opacity-50 disabled:grayscale"
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={page >= totalPages}
                        onClick={() => onPageChange(page + 1)}
                        className="h-9 px-3 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-900 font-bold transition-all hover:scale-105 active:scale-95 shadow-sm disabled:opacity-50 disabled:grayscale"
                    >
                        Próximo <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
