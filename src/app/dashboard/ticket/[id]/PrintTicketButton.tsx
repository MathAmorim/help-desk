"use client";
"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function PrintTicketButton() {
    return (
        <Button
            variant="outline"
            onClick={() => window.print()}
            className="h-10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/10 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 shadow-sm print:hidden gap-2 shrink-0"
        >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline text-sm font-medium">Imprimir</span>
        </Button>
    );
}
