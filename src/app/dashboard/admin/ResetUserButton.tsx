"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { KeyRound, Loader2, Copy, Check } from "lucide-react";
import { resetUserPassword } from "@/app/actions/users";

export default function ResetUserButton({ userId, userName }: { userId: string, userName: string }) {
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, setIsPending] = useState(false);
    const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    async function handleReset() {
        setIsPending(true);
        setError(null);

        try {
            const result = await resetUserPassword(userId);
            setGeneratedPassword(result.tempPassword);
        } catch (err: any) {
            setError(err.message || "Erro ao resetar senha.");
        } finally {
            setIsPending(false);
        }
    }

    const handleCopy = () => {
        if (generatedPassword) {
            navigator.clipboard.writeText(generatedPassword);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleClose = () => {
        setOpen(false);
        setTimeout(() => {
            setGeneratedPassword(null);
            setError(null);
        }, 300);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={
                <Button variant="outline" size="sm" className="h-8 text-amber-600 dark:text-amber-500 border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-900 transition-all hover:scale-105 active:scale-95 shadow-sm" />
            }>
                <KeyRound className="h-4 w-4 mr-2" />
                Resetar Senha
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                {!generatedPassword ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Resetar Senha</DialogTitle>
                            <DialogDescription>
                                Tem certeza que deseja invalidar a senha atual de <strong>{userName}</strong>?
                                Uma nova senha será gerada e ele será forçado a trocá-la no primeiro acesso.
                            </DialogDescription>
                        </DialogHeader>

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-md text-sm my-4">
                                {error}
                            </div>
                        )}

                        <DialogFooter className="mt-4">
                            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending} className="h-10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/10 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 shadow-sm">
                                Cancelar
                            </Button>
                            <Button variant="outline" onClick={handleReset} disabled={isPending} className="h-10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900 font-bold transition-all hover:scale-105 active:scale-95 shadow-sm">
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Confirmar e Gerar Senha
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <div className="space-y-6 py-4">
                        <div className="flex flex-col items-center justify-center text-center space-y-4">
                            <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                                <KeyRound className="h-6 w-6 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Senha Alterada!</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    O usuário <strong>{userName}</strong> será obrigado a trocar a senha no próximo login. Envie esta senha provisória:
                                </p>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col space-y-2 relative">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Nova Senha Provisória</span>
                            <div className="flex items-center justify-center gap-2">
                                <code className="text-xl font-mono font-bold bg-white dark:bg-slate-950 px-3 py-1 rounded border shadow-sm">
                                    {generatedPassword}
                                </code>
                                <Button size="icon" variant="secondary" onClick={handleCopy} className="shrink-0 flex" title="Copiar Senha">
                                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                </Button>
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
