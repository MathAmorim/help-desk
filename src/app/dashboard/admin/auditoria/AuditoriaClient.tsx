"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuditLogs, getAuditUsers } from "@/app/actions/audit";
import AuditLogFilters from "./AuditLogFilters";
import AuditLogTable from "./AuditLogTable";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { FileText, AlertCircle, ShieldCheck } from "lucide-react";

export default function AuditoriaClient() {
    const [logs, setLogs] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        page: 1,
        limit: 50,
        userId: "",
        acao: "TODOS",
        startDate: "",
        endDate: ""
    });

    const fetchLogs = useCallback(async (currentFilters: any) => {
        setLoading(true);
        try {
            const result = await getAuditLogs(currentFilters);
            setLogs(result.logs);
            setTotal(result.total);
            setTotalPages(result.totalPages);
        } catch (error: any) {
            toast.error(error.message || "Erro ao carregar logs");
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Inicializar usuários e primeira carga de logs
        async function init() {
            try {
                const fetchedUsers = await getAuditUsers();
                setUsers(fetchedUsers);
                // Primeira carga de logs
                const result = await getAuditLogs(filters);
                setLogs(result.logs);
                setTotal(result.total);
                setTotalPages(result.totalPages);
            } catch (e) {
                toast.error("Erro na inicialização da auditoria");
            } finally {
                setLoading(false);
            }
        }
        init();
    }, []); // Run once on mount

    const handleFilterChange = (newFilters: any) => {
        setFilters(newFilters);
        fetchLogs(newFilters);
    };

    const handlePageChange = (newPage: number) => {
        const updated = { ...filters, page: newPage };
        setFilters(updated);
        fetchLogs(updated);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
                        <ShieldCheck className="h-8 w-8 text-indigo-600" />
                        Auditoria do Sistema
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Histórico detalhado de todas as operações críticas.
                    </p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-lg px-4 py-2 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Monitoramento Ativo</span>
                </div>
            </div>

            <AuditLogFilters 
                users={users} 
                onFilter={handleFilterChange} 
                currentFilters={filters} 
            />

            <Card className="border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b pb-4">
                    <div className="flex justify-between items-center">
                        <div className="space-y-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileText className="h-4 w-4 text-indigo-500" />
                                Registros de Sistema
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Visualização cronológica das ações realizadas por usuários e pelo sistema.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <AuditLogTable 
                        logs={logs} 
                        total={total} 
                        page={filters.page} 
                        totalPages={totalPages} 
                        onPageChange={handlePageChange}
                        isLoading={loading}
                    />
                </CardContent>
            </Card>

            
        </div>
    );
}
