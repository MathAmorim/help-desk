"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { createCategory } from "@/app/actions/categorias";

export default function NewCategoryButton() {
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, setIsPending] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsPending(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const nome = formData.get("nome") as string;
        const prioridadePadrao = formData.get("prioridadePadrao") as string;
        const placeholder = formData.get("placeholder") as string;

        try {
            await createCategory(nome, prioridadePadrao, placeholder);
            setOpen(false);
        } catch (err: any) {
            setError(err.message || "Ocorreu um erro ao criar a categoria.");
        } finally {
            setIsPending(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button className="bg-black text-white hover:bg-black/80" />}>
                <Plus className="mr-2 h-4 w-4" /> Nova Categoria
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Nova Categoria</DialogTitle>
                        <DialogDescription>
                            Adicione um novo tipo de chamado e defina sua prioridade base.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-md text-sm">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="nome">Nome da Categoria</Label>
                            <Input id="nome" name="nome" placeholder="Ex: MANUTENÇÃO" required className="uppercase" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="placeholder">Instruções para o Usuário (Opcional)</Label>
                            <Input id="placeholder" name="placeholder" placeholder="Ex: Informe qual sistema, a placa da máquina..." />
                            <p className="text-[0.8rem] text-slate-500 dark:text-slate-400">Exibido na caixa de texto quando esta categoria for selecionada.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="prioridadePadrao">Prioridade Padrão</Label>
                            <Select name="prioridadePadrao" defaultValue="BAIXA" required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="BAIXA">Baixa</SelectItem>
                                    <SelectItem value="MEDIA">Média</SelectItem>
                                    <SelectItem value="ALTA">Alta</SelectItem>
                                    <SelectItem value="CRITICA">Crítica</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Salvar Categoria
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
