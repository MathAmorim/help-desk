"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

export function Filters({ categoriasDisponiveis }: { categoriasDisponiveis: string[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const currentQ = searchParams.get("q") || "";
    const currentStatus = searchParams.get("status") || "TODOS";
    const currentCategoria = searchParams.get("categoria") || "TODOS";

    const [q, setQ] = useState(currentQ);
    const [status, setStatus] = useState(currentStatus);
    const [categoria, setCategoria] = useState(currentCategoria);

    const statusLabels: Record<string, string> = {
        "TODOS": "Todos Status",
        "ABERTO": "Aberto",
        "EM_ANDAMENTO": "Em Andamento",
        "PENDENTE_USUARIO": "Pendente",
        "RESOLVIDO": "Resolvido"
    };

    const applyFilters = useCallback((newQ: string, newStatus: string, newCategoria: string) => {
        const params = new URLSearchParams(searchParams?.toString() || "");
        if (newQ) params.set("q", newQ); else params.delete("q");
        if (newStatus && newStatus !== "TODOS") params.set("status", newStatus); else params.delete("status");
        if (newCategoria && newCategoria !== "TODOS") params.set("categoria", newCategoria); else params.delete("categoria");

        router.push(`/dashboard?${params.toString()}`);
    }, [router, searchParams]);

    // Busca em tempo real com debounce
    useEffect(() => {
        if (q === currentQ) return; // Evita loop infinito na montagem

        const delayDebounceFn = setTimeout(() => {
            applyFilters(q, status, categoria);
        }, 400); // 400ms de delay

        return () => clearTimeout(delayDebounceFn);
    }, [q, applyFilters, status, categoria, currentQ]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters(q, status, categoria);
    };

    const handleClear = () => {
        setQ("");
        setStatus("TODOS");
        setCategoria("TODOS");
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
                <Select value={categoria} onValueChange={(val) => { setCategoria(val || "TODOS"); applyFilters(q || "", status || "TODOS", val || "TODOS"); }}>
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
                <Select value={status} onValueChange={(val) => { setStatus(val || "TODOS"); applyFilters(q || "", val || "TODOS", categoria || "TODOS"); }}>
                    <SelectTrigger>
                        <SelectValue placeholder="Status">{statusLabels[status] || status}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="TODOS">Todos Status</SelectItem>
                        <SelectItem value="ABERTO">Aberto</SelectItem>
                        <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                        <SelectItem value="PENDENTE_USUARIO">Pendente</SelectItem>
                        <SelectItem value="RESOLVIDO">Resolvido</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <Button type="submit" variant="secondary" className="flex-1 sm:flex-none h-10">
                    Filtrar
                </Button>
                {(q || status !== "TODOS" || categoria !== "TODOS") && (
                    <Button type="button" variant="ghost" className="px-3 h-10 border" onClick={handleClear} title="Limpar Filtros">
                        <X className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    </Button>
                )}
            </div>
        </form>
    );
}
