"use client";

import { useTransition } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Loader2, XCircle } from "lucide-react";

interface AuditLogFiltersProps {
    users: { id: string; name: string }[];
    onFilter: (filters: any) => void;
    currentFilters: any;
}

export default function AuditLogFilters({ users, onFilter, currentFilters }: AuditLogFiltersProps) {
    const [isPending, startTransition] = useTransition();

    const actions = [
        "TODOS",
        "ABERTURA", 
        "MUDANCA_STATUS", 
        "COMENTARIO", 
        "ATRIBUICAO", 
        "RESOLUCAO", 
        "FECHAMENTO", 
        "REABERTURA", 
        "LOGIN_FAILED", 
        "PASSWORD_RESET", 
        "ROLE_CHANGE"
    ];

    const handleChange = (key: string, value: string) => {
        onFilter({ ...currentFilters, [key]: value, page: 1 });
    };

    const clearFilters = () => {
        onFilter({ page: 1, limit: 50 });
    };

    return (
        <div className="bg-white dark:bg-slate-900 border rounded-xl p-6 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Ator (Usuário)</Label>
                    <Select 
                        value={currentFilters.userId || "TODOS"} 
                        onValueChange={(val) => handleChange("userId", val === "TODOS" ? "" : val)}
                    >
                        <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-none h-11">
                            <SelectValue placeholder="Selecione um usuário" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="TODOS">Todos os Usuários</SelectItem>
                            {users.map(u => (
                                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tipo de Ação</Label>
                    <Select 
                        value={currentFilters.acao || "TODOS"} 
                        onValueChange={(val) => handleChange("acao", val)}
                    >
                        <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-none h-11">
                            <SelectValue placeholder="Selecione a ação" />
                        </SelectTrigger>
                        <SelectContent>
                            {actions.map(a => (
                                <SelectItem key={a} value={a}>{a.replace("_", " ")}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Data Inicial</Label>
                    <Input 
                        type="date" 
                        className="bg-slate-50 dark:bg-slate-800 border-none h-11"
                        value={currentFilters.startDate || ""}
                        onChange={(e) => handleChange("startDate", e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Data Final</Label>
                    <Input 
                        type="date" 
                        className="bg-slate-50 dark:bg-slate-800 border-none h-11"
                        value={currentFilters.endDate || ""}
                        onChange={(e) => handleChange("endDate", e.target.value)}
                    />
                </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
                <p className="text-xs text-slate-400 italic">
                    Mostrando logs em tempo real filtrados pelo servidor.
                </p>
                <div className="flex gap-2">
                   <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={clearFilters}
                        className="h-9 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900 font-bold transition-all hover:scale-105 active:scale-95 shadow-sm gap-1.5"
                    >
                        <XCircle className="h-4 w-4" /> Limpar Filtros
                    </Button>
                </div>
            </div>
        </div>
    );
}
