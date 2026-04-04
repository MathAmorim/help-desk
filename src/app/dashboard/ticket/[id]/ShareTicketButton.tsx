"use client";

import { Button } from "@/components/ui/button";
import { Share2, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
    ticketIdHex: string;
    ticketTitle: string;
}

export default function ShareTicketButton({ ticketIdHex, ticketTitle }: Props) {
    const [copied, setCopied] = useState(false);

    const handleShare = () => {
        // Pega a URL atual automaticamente
        const currentUrl = window.location.href;
        const textToCopy = `Chamado #${ticketIdHex}\nLink: ${currentUrl}`;

        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopied(true);
            toast.success("Resumo do chamado copiado!");
            setTimeout(() => setCopied(false), 2000);
        }).catch(() => {
            toast.error("Falha ao acessar a área de transferência.");
        });
    };

    return (
        <Button variant="outline" onClick={handleShare} className="gap-2 shrink-0 border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 hover:text-indigo-800 dark:border-indigo-800 dark:text-indigo-300 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50">
            {copied ? <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <Share2 className="h-4 w-4" />}
            <span className="hidden sm:inline text-sm font-medium">{copied ? "Copiado!" : "Copiar Link do Chamado"}</span>
        </Button>
    );
}
