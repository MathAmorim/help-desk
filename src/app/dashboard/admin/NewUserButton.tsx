"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Loader2, Copy, Check } from "lucide-react";
import { createUser } from "@/app/actions/users";

export default function NewUserButton({ sectors = [] }: { sectors?: string[] }) {
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, setIsPending] = useState(false);
    const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
    const [generatedCpf, setGeneratedCpf] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsPending(true);
        setError(null);
        setGeneratedPassword(null);
        setCopied(false);

        const formData = new FormData(e.currentTarget);
        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const cpf = formData.get("cpf") as string;
        const role = formData.get("role") as string;
        const funcao = formData.get("funcao") as string;
        const setor = formData.get("setor") as string;

        try {
            const result = await createUser({ name, email, role, cpf, funcao, setor });
            setGeneratedPassword(result.tempPassword);
            setGeneratedCpf(cpf);
        } catch (err: any) {
            setError(err.message || "Ocorreu um erro ao criar usuário.");
        } finally {
            setIsPending(false);
        }
    }

    const handleCopy = () => {
        if (generatedPassword && generatedCpf) {
            const copyText = `Acesse o sistema usando essas informações de login, o sistema vai obrigar a cadastrar uma nova senha no primeiro acesso.\nLogin: ${generatedCpf}\nSenha: ${generatedPassword}`;
            navigator.clipboard.writeText(copyText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleClose = () => {
        setOpen(false);
        // Reseta tudo ao fechar
        setTimeout(() => {
            setGeneratedPassword(null);
            setGeneratedCpf(null);
            setError(null);
        }, 300);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={
                <Button variant="outline" className="w-full h-10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900 font-bold transition-all hover:scale-105 active:scale-95 shadow-sm" />
            }>
                <div className="flex items-center justify-center">
                    <UserPlus className="mr-2 h-4 w-4 shrink-0" /> 
                    <span className="sm:hidden">Novo</span>
                    <span className="hidden sm:inline">Cadastrar Usuário</span>
                </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                {!generatedPassword ? (
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>Novo Usuário</DialogTitle>
                            <DialogDescription>
                                Uma senha aleatória será gerada de forma segura e ele será obrigado a trocá-la no primeiro acesso.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-md text-sm">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome Completo</Label>
                                <Input id="name" name="name" placeholder="Ex: Maria José" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cpf">CPF <span className="text-xs font-normal text-slate-500">(Apenas Números)</span></Label>
                                <Input
                                    id="cpf"
                                    name="cpf"
                                    placeholder="Somente os 11 números"
                                    required
                                    onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '').slice(0, 11); }}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">E-mail <span className="text-xs font-normal text-slate-500">(Opcional)</span></Label>
                                <Input id="email" name="email" type="email" placeholder="maria@empresa.com" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role">Perfil de Acesso</Label>
                                <Select name="role" defaultValue="USUARIO" required>
                                    <SelectTrigger>
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
                                    <Label htmlFor="funcao">Função/Cargo</Label>
                                    <Input id="funcao" name="funcao" placeholder="Ex: Analista Financeiro" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="setor">Setor</Label>
                                    <Input
                                        id="setor"
                                        name="setor"
                                        placeholder="Selecione ou digite um novo..."
                                        list="setor-list"
                                        autoComplete="off"
                                        required
                                    />
                                    <datalist id="setor-list">
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
                                Criar Conta e Gerar Senha
                            </Button>
                        </DialogFooter>
                    </form>
                ) : (
                    <div className="space-y-6 py-4">
                        <div className="flex flex-col items-center justify-center text-center space-y-4">
                            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                                <Check className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Usuário Criado!</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Copie a senha provisória abaixo e envie para o novo usuário.
                                </p>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col space-y-2 relative">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Senha Gerada</span>
                            <div className="flex items-center justify-center gap-2">
                                <code className="text-xl font-mono font-bold bg-white dark:bg-slate-950 px-3 py-1 rounded border shadow-sm">
                                    {generatedPassword}
                                </code>
                                <Button size="icon" variant="secondary" onClick={handleCopy} className="shrink-0 flex" title="Copiar Senha">
                                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                            <div className="text-center text-xs text-amber-600 font-medium pt-2">
                                A troca de senha é obrigatória.
                            </div>
                        </div>

                        <Button variant="outline" className="w-full h-10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900 font-bold transition-all hover:scale-105 active:scale-95 shadow-sm" onClick={handleClose}>
                            Concluir
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
