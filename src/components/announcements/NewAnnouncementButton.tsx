"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Megaphone, PlusCircle } from "lucide-react";
import { createAnnouncement } from "@/app/actions/announcements";
import { toast } from "sonner";

export default function NewAnnouncementButton() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const title = formData.get("title") as string;
        const content = formData.get("content") as string;
        const severity = formData.get("severity") as string;
        const expiresAt = formData.get("expiresAt") as string || null;

        try {
            await createAnnouncement({ title, content, severity, expiresAt });
            toast.success("Aviso criado com sucesso!");
            setOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Erro ao criar aviso");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={
                <Button className="h-10 text-white bg-indigo-600 hover:bg-indigo-700 font-bold transition-all hover:scale-105 active:scale-95 shadow-sm">
                    <PlusCircle className="mr-2 h-5 w-5" /> Novo Aviso
                </Button>
            } />
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Megaphone className="h-5 w-5 text-indigo-600" />
                            Criar Novo Aviso
                        </DialogTitle>
                        <DialogDescription>
                            Preencha os detalhes do comunicado para os usuários.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Título do Aviso</Label>
                            <Input
                                id="title"
                                name="title"
                                placeholder="Ex: Manutenção Preventiva de Internet"
                                required
                                disabled={loading}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="content">Conteúdo / Descrição</Label>
                            <Textarea
                                id="content"
                                name="content"
                                placeholder="Descreva os detalhes do problema ou aviso..."
                                className="min-h-[100px]"
                                required
                                disabled={loading}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="severity">Gravidade</Label>
                                <Select name="severity" defaultValue="INFO" disabled={loading}>
                                    <SelectTrigger id="severity">
                                        <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="INFO">Informativo</SelectItem>
                                        <SelectItem value="WARNING">Aviso / Médio</SelectItem>
                                        <SelectItem value="CRITICAL">Crítico / Urgente</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="expiresAt">Expira em (Opcional)</Label>
                                <Input
                                    id="expiresAt"
                                    name="expiresAt"
                                    type="datetime-local"
                                    disabled={loading}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
                            {loading ? "Criando..." : "Criar Aviso"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
