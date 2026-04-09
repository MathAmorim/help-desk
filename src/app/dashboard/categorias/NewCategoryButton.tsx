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
        const tempoResolucao = parseInt(formData.get("tempoResolucao") as string) || 72;

        try {
            await createCategory(nome, prioridadePadrao, placeholder, tempoResolucao);
            setOpen(false);
        } catch (err: any) {
            setError(err.message || "Ocorreu um erro ao criar a categoria.");
        } finally {
            setIsPending(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={
                <Button variant="outline" className="h-10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-900 font-bold transition-all hover:scale-105 active:scale-95 shadow-sm" />
            }>
                <Plus className="mr-2 h-4 w-4" /> Nova Categoria
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Nova Categoria</DialogTitle>
                        <DialogDescription>
                            Adicione um novo tipo de chamado e defina sua prioridade base e SLA.
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
                        <div className="space-y-4 pt-2">
                            <div className="grid grid-cols-2 gap-4">
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
                                <div className="space-y-2">
                                    <Label htmlFor="tempoResolucao">SLA (Horas)</Label>
                                    <Input id="tempoResolucao" name="tempoResolucao" type="number" defaultValue={72} min={1} required />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="placeholder">Instruções para o Usuário (Opcional)</Label>
                            <Input id="placeholder" name="placeholder" placeholder="Ex: Informe qual sistema, a placa da máquina..." />
                            <p className="text-[0.75rem] text-slate-500 dark:text-slate-400">Exibido na caixa de texto quando esta categoria for selecionada.</p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/10 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 shadow-sm">
                            Cancelar
                        </Button>
                        <Button type="submit" variant="outline" className="h-10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900 font-bold transition-all hover:scale-105 active:scale-95 shadow-sm" disabled={isPending}>
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Salvar Categoria
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
