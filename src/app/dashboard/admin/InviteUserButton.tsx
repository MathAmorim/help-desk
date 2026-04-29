"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link2, Loader2, Copy, Check, ExternalLink } from "lucide-react";
import { generateInviteLink } from "@/app/actions/invites";
import Link from "next/link";

export default function InviteUserButton() {
    const [open, setOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [inviteUrl, setInviteUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    async function handleGenerate() {
        setIsPending(true);
        try {
            const result = await generateInviteLink();
            if (result.success) {
                setInviteUrl(result.inviteUrl);
            }
        } catch (error) {
            console.error("Erro ao gerar convite:", error);
        } finally {
            setIsPending(false);
        }
    }

    const handleCopy = () => {
        if (inviteUrl) {
            navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleClose = () => {
        setOpen(false);
        setTimeout(() => {
            setInviteUrl(null);
            setCopied(false);
        }, 300);
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
            <DialogTrigger render={
                <Button onClick={() => setOpen(true)} variant="outline" className="w-full h-10 border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/20 hover:bg-sky-100 dark:hover:bg-sky-900 font-extrabold transition-all hover:scale-105 active:scale-95 shadow-sm" />
            }>
                <div className="flex items-center justify-center">
                    <Link2 className="mr-2 h-5 w-5 shrink-0" /> 
                    <span>Convidar<span className="hidden sm:inline ml-1">Usuário</span></span>
                </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Gerar Link de Convite</DialogTitle>
                    <DialogDescription>
                        Crie um link de uso único para que o usuário realize o próprio cadastro. O link expira em 48 horas.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {!inviteUrl ? (
                        <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <Link2 className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
                            <p className="text-sm text-slate-500 mb-4">Nenhum link gerado ainda</p>
                            <Button onClick={handleGenerate} disabled={isPending} className="bg-sky-600 hover:bg-sky-700">
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Gerando...
                                    </>
                                ) : (
                                    "Gerar Novo Link"
                                )}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in zoom-in-95 duration-200">
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-lg">
                                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase mb-1">Link Gerado com Sucesso!</p>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-white dark:bg-slate-900 border rounded p-2 text-xs font-mono break-all line-clamp-2 overflow-hidden border-emerald-200 dark:border-emerald-800">
                                        {inviteUrl}
                                    </div>
                                    <Button size="icon" variant="ghost" onClick={handleCopy} className="shrink-0 h-10 w-10 text-emerald-600">
                                        {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                                    </Button>
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-2">
                                <Link href={inviteUrl} target="_blank">
                                    <Button variant="outline" className="w-full text-xs h-9">
                                        <ExternalLink className="mr-2 h-3 w-3" /> Abrir Link para Teste
                                    </Button>
                                </Link>
                                <p className="text-[10px] text-center text-slate-500">
                                    ⚠️ O link acima só pode ser usado <strong>uma única vez</strong>. Ao realizar o cadastro, ele será invalidado.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={handleClose}>
                        Fechar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
