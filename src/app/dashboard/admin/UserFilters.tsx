"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import ImportExportButtons from "./ImportExportButtons";

export default function UserFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const currentQ = searchParams?.get("q") || "";
    const [q, setQ] = useState(currentQ);

    const applySearch = useCallback((newQ: string) => {
        const params = new URLSearchParams(searchParams?.toString() || "");
        if (newQ) params.set("q", newQ); else params.delete("q");
        router.push(`/dashboard/admin?${params.toString()}`);
    }, [router, searchParams]);

    useEffect(() => {
        if (q === currentQ) return;
        const timer = setTimeout(() => {
            applySearch(q);
        }, 400);
        return () => clearTimeout(timer);
    }, [q, currentQ, applySearch]);

    return (
        <div className="p-4 border-b bg-slate-50/30 dark:bg-slate-900/10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Buscar por nome, CPF, setor ou cargo"
                        className="pl-9 h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                </div>
                <ImportExportButtons />
            </div>
        </div>
    );
}
