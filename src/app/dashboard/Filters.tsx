"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X, Clock, AlertCircle } from "lucide-react";

export function Filters({ categoriasDisponiveis }: { categoriasDisponiveis: string[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const currentQ = searchParams.get("q") || "";
    const currentStatus = searchParams.get("status") || "TODOS";
    const currentCategoria = searchParams.get("categoria") || "TODOS";
    const currentAtrasado = searchParams.get("atrasado") === "true";

    const [q, setQ] = useState(currentQ);
    const [status, setStatus] = useState(currentStatus);
    const [categoria, setCategoria] = useState(currentCategoria);
    const [atrasado, setAtrasado] = useState(currentAtrasado);

    const statusLabels: Record<string, string> = {
        "TODOS": "Todos Status",
        "ABERTO": "Aberto",
        "EM_ANDAMENTO": "Em Andamento",
        "AGUARDANDO_USUARIO": "Aguardando Usuário",
        "RESOLVIDO": "Resolvido"
    };

    const applyFilters = useCallback((newQ: string, newStatus: string, newCategoria: string, newAtrasado: boolean) => {
        const params = new URLSearchParams(searchParams?.toString() || "");
        if (newQ) params.set("q", newQ); else params.delete("q");
        if (newStatus && newStatus !== "TODOS") params.set("status", newStatus); else params.delete("status");
        if (newCategoria && newCategoria !== "TODOS") params.set("categoria", newCategoria); else params.delete("categoria");
        if (newAtrasado) params.set("atrasado", "true"); else params.delete("atrasado");

        router.push(`/dashboard?${params.toString()}`);
    }, [router, searchParams]);

    // Busca em tempo real com debounce
    useEffect(() => {
        if (q === currentQ && status === currentStatus && categoria === currentCategoria && atrasado === currentAtrasado) return; 

        const delayDebounceFn = setTimeout(() => {
            applyFilters(q, status, categoria, atrasado);
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [q, status, categoria, atrasado, applyFilters, currentQ, currentStatus, currentCategoria, currentAtrasado]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters(q, status, categoria, atrasado);
    };

    const handleClear = () => {
        setQ("");
        setStatus("TODOS");
        setCategoria("TODOS");
        setAtrasado(false);
        router.push("/dashboard");
    };

    return (
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 items-end sm:items-center bg-white dark:bg-slate-950 p-4 rounded-lg border shadow-sm mb-6">
            <div className="flex-1 w-full space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Busca Rápida</label>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Pesquise título, autor, id..."
                        className="pl-9"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                </div>
            </div>

            <div className="w-full sm:w-[190px] space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Categoria</label>
                <Select value={categoria} onValueChange={(val) => { setCategoria(val || "TODOS"); applyFilters(q || "", status || "TODOS", val || "TODOS", atrasado); }}>
                    <SelectTrigger>
                        <SelectValue placeholder="Categoria">{categoria !== "TODOS" ? categoria : "Todas Categorias"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="TODOS">Todas Categorias</SelectItem>
                        {categoriasDisponiveis.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="w-full sm:w-[170px] space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                <Select value={status} onValueChange={(val) => { setStatus(val || "TODOS"); applyFilters(q || "", val || "TODOS", categoria || "TODOS", atrasado); }}>
                    <SelectTrigger>
                        <SelectValue placeholder="Status">{statusLabels[status] || status}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="TODOS">Todos Status</SelectItem>
                        <SelectItem value="ABERTO">Aberto</SelectItem>
                        <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                        <SelectItem value="AGUARDANDO_USUARIO">Aguardando Usuário</SelectItem>
                        <SelectItem value="RESOLVIDO">Resolvido</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="w-full sm:w-auto h-full flex items-end">
                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                        const next = !atrasado;
                        setAtrasado(next);
                        applyFilters(q, status, categoria, next);
                    }}
                    className={`h-10 transition-all font-bold shadow-sm ${
                        atrasado 
                        ? "text-white border-red-700 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:text-white ring-0" 
                        : "text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                    }`}
                >
                    <Clock className={`h-4 w-4 mr-2 ${atrasado ? "text-white" : ""}`} />
                    Em Atraso
                </Button>
            </div>

            <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 items-end">
                <Button type="submit" variant="outline" className="h-10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-900 font-bold transition-all hover:scale-105 active:scale-95 shadow-sm flex-1 sm:flex-none">
                    Filtrar
                </Button>
                {(q || status !== "TODOS" || categoria !== "TODOS") && (
                    <Button type="button" variant="outline" className="h-10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900 transition-all hover:scale-105 active:scale-95 shadow-sm px-3" onClick={handleClear} title="Limpar Filtros">
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </form>
    );
}
