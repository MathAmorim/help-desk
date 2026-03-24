"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function PrintTicketButton() {
    return (
        <Button
            variant="outline"
            onClick={() => window.print()}
            className="print:hidden bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:border-slate-700"
        >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
        </Button>
    );
}
