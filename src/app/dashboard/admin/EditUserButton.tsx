"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pencil, Loader2 } from "lucide-react";
import { updateUser } from "@/app/actions/users";
import { toast } from "sonner";

export default function EditUserButton({ user, sectors = [] }: { user: any, sectors?: string[] }) {
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, setIsPending] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsPending(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const cpf = formData.get("cpf") as string;
        const role = formData.get("role") as string;
        const funcao = formData.get("funcao") as string;
        const setor = formData.get("setor") as string;

        try {
            await updateUser({ id: user.id, name, email, role, cpf, funcao, setor });
            toast.success("Usuário atualizado com sucesso");
            setOpen(false);
        } catch (err: any) {
            setError(err.message || "Ocorreu um erro ao atualizar usuário.");
        } finally {
            setIsPending(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={
                <Button variant="outline" size="icon" className="h-8 w-8 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-all hover:scale-110 shadow-sm mr-2" title="Editar Usuário" type="button" />
            }>
                <Pencil className="h-4 w-4" />
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                {open && (
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>Editar Usuário</DialogTitle>
                            <DialogDescription>
                                Altere as informações cadastrais.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-md text-sm">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor={`name-${user.id}`}>Nome Completo</Label>
                                <Input id={`name-${user.id}`} name="name" defaultValue={user.name || ""} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`cpf-${user.id}`}>CPF <span className="text-xs font-normal text-slate-500">(Apenas Números)</span></Label>
                                <Input
                                    id={`cpf-${user.id}`}
                                    name="cpf"
                                    defaultValue={user.cpf || ""}
                                    required
                                    onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '').slice(0, 11); }}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`email-${user.id}`}>E-mail <span className="text-xs font-normal text-slate-500">(Opcional)</span></Label>
                                <Input id={`email-${user.id}`} name="email" type="email" defaultValue={user.email || ""} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`role-${user.id}`}>Perfil de Acesso</Label>
                                <Select name="role" defaultValue={user.role || "USUARIO"} required>
                                    <SelectTrigger id={`role-${user.id}`}>
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="USUARIO">Usuário Comum</SelectItem>
                                        <SelectItem value="SUPORTE">Agente de Suporte</SelectItem>
                                        <SelectItem value="ADMIN">Administrador</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor={`funcao-${user.id}`}>Função/Cargo</Label>
                                    <Input id={`funcao-${user.id}`} name="funcao" defaultValue={user.funcao || ""} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor={`setor-${user.id}`}>Setor</Label>
                                    <Input
                                        id={`setor-${user.id}`}
                                        name="setor"
                                        defaultValue={user.setor || ""}
                                        placeholder="Selecione..."
                                        list={`setor-list-edit-${user.id}`}
                                        autoComplete="off"
                                        required
                                    />
                                    <datalist id={`setor-list-edit-${user.id}`}>
                                        {sectors.map((s, idx) => (
                                            <option key={idx} value={s} />
                                        ))}
                                    </datalist>
                                </div>
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
                )}
            </DialogContent>
        </Dialog>
    );
}
