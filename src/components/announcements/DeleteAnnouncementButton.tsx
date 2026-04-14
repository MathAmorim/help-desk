"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteAnnouncement } from "@/app/actions/announcements";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export default function DeleteAnnouncementButton({ id }: { id: string }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleDelete() {
        setLoading(true);
        try {
            await deleteAnnouncement(id);
            toast.success("Aviso excluído com sucesso!");
            setOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Erro ao excluir aviso");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={
                <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20">
                    <Trash2 className="h-4 w-4" />
                </Button>
            } />
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Excluir Aviso</DialogTitle>
                    <DialogDescription>
                        Tem certeza que deseja excluir este aviso? Esta ação não pode ser desfeita.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                        {loading ? "Excluindo..." : "Excluir para Sempre"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
