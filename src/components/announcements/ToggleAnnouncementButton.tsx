"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Power, PowerOff } from "lucide-react";
import { toggleAnnouncementStatus } from "@/app/actions/announcements";
import { toast } from "sonner";

export default function ToggleAnnouncementButton({ id, active }: { id: string, active: boolean }) {
    const [loading, setLoading] = useState(false);

    async function handleToggle() {
        setLoading(true);
        try {
            await toggleAnnouncementStatus(id, !active);
            toast.success(`Aviso ${!active ? "ativado" : "desativado"} com sucesso!`);
        } catch (error: any) {
            toast.error(error.message || "Erro ao alterar status");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 transition-colors ${active ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"}`}
            onClick={handleToggle}
            disabled={loading}
            title={active ? "Desativar Aviso" : "Ativar Aviso"}
        >
            {active ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
        </Button>
    );
}
