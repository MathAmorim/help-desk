"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Edit, Loader2 } from "lucide-react";
import { updateCategory } from "@/app/actions/categorias";

export default function EditCategoryButton({ category }: { category: any }) {
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, setIsPending] = useState(false);
    const [ativo, setAtivo] = useState(category.ativo ? "sim" : "nao");

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsPending(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const nome = formData.get("nome") as string;
        const prioridadePadrao = formData.get("prioridadePadrao") as string;
        const placeholder = formData.get("placeholder") as string;

        try {
            await updateCategory(category.id, nome, prioridadePadrao, ativo === "sim", placeholder);
            setOpen(false);
        } catch (err: any) {
            setError(err.message || "Ocorreu um erro ao atualizar a categoria.");
        } finally {
            setIsPending(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={
                <Button variant="outline" size="sm" className="h-8 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-all hover:scale-105 active:scale-95 shadow-sm" />
            }>
                <Edit className="h-4 w-4 mr-2" /> Editar
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Editar Categoria</DialogTitle>
                        <DialogDescription>
                            Altere as preferências desta categoria ou desative-a.
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
                            <Input id="nome" name="nome" defaultValue={category.nome} required className="uppercase" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="placeholder">Instruções para o Usuário (Opcional)</Label>
                            <Input id="placeholder" name="placeholder" defaultValue={category.placeholder || ""} placeholder="Ex: Informe a placa e setor" />
                            <p className="text-[0.8rem] text-slate-500 dark:text-slate-400">Exibido na caixa de relato de problema como guia.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="prioridadePadrao">Prioridade Padrão</Label>
                            <Select name="prioridadePadrao" defaultValue={category.prioridadePadrao} required>
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
                            <Label htmlFor="ativo">Status de Visibilidade</Label>
                            <Select value={ativo} onValueChange={(val) => setAtivo(val || "nao")} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="sim">Ativo (Visível)</SelectItem>
                                    <SelectItem value="nao">Inativo (Oculto)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/10 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 shadow-sm">
                            Cancelar
                        </Button>
                        <Button type="submit" variant="outline" className="h-10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900 font-bold transition-all hover:scale-105 active:scale-95 shadow-sm" disabled={isPending}>
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Salvar Alterações
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
