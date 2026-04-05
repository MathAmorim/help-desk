"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SortButtonProps {
    column: string;
    label: string;
}

export default function SortButton({ column, label }: SortButtonProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const currentSort = searchParams?.get("sortBy") || "";
    const currentOrder = searchParams?.get("order") || "asc";
    
    const isActive = currentSort === column;

    const toggleSort = () => {
        const params = new URLSearchParams(searchParams?.toString() || "");
        
        if (isActive) {
            if (currentOrder === "asc") {
                params.set("order", "desc");
            } else {
                params.delete("sortBy");
                params.delete("order");
            }
        } else {
            params.set("sortBy", column);
            params.set("order", "asc");
        }
        
        router.push(`/dashboard/admin?${params.toString()}`);
    };

    return (
        <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleSort}
            className={`h-8 px-2 hover:bg-slate-200 dark:hover:bg-slate-800 -ml-2 font-bold ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-600 dark:text-slate-400"}`}
        >
            {label}
            {isActive ? (
                currentOrder === "asc" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
            ) : (
                <ChevronsUpDown className="ml-1 h-4 w-4 opacity-30" />
            )}
        </Button>
    );
}
