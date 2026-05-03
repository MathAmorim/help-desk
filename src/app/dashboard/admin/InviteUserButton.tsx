"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link2, Loader2, Copy, Check, ExternalLink, History, Trash2, ShieldCheck, Clock, UserCheck } from "lucide-react";
import { generateInviteLink, getInvites, revokeInvite } from "@/app/actions/invites";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

export default function InviteUserButton() {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"new" | "history">("new");
    const [isPending, setIsPending] = useState(false);
    const [inviteUrl, setInviteUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [invites, setInvites] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    async function handleGenerate() {
        setOpen(true);
        setActiveTab("new");
        setIsPending(true);
        setInviteUrl(null);
        setCopied(false);

        try {
            const result = await generateInviteLink();
            if (result.success) {
                setInviteUrl(result.inviteUrl);
                // Copia automaticamente com mensagem
                const message = `Use este link único para realizar seu cadastro: ${result.inviteUrl}\n\n*Atenção: Este link expira em 48 horas e só pode ser usado uma única vez.*`;
                navigator.clipboard.writeText(message);
                setCopied(true);
                setTimeout(() => setCopied(false), 3000);
            }
        } catch (error) {
            console.error("Erro ao gerar convite:", error);
        } finally {
            setIsPending(false);
        }
    }

    async function loadHistory() {
        setIsLoadingHistory(true);
        try {
            const data = await getInvites();
            setInvites(data);
        } catch (error) {
            console.error("Erro ao carregar histórico:", error);
        } finally {
            setIsLoadingHistory(false);
        }
    }

    async function handleRevoke(id: string) {
        if (!confirm("Tem certeza que deseja revogar este link? Ele deixará de funcionar imediatamente.")) return;
        try {
            await revokeInvite(id);
            setInvites(prev => prev.filter(inv => inv.id !== id));
        } catch (error) {
            console.error("Erro ao revogar:", error);
        }
    }

    useEffect(() => {
        if (open && activeTab === "history") {
            loadHistory();
        }
    }, [open, activeTab]);

    const handleCopy = async (customUrl?: string) => {
        const url = customUrl || inviteUrl;
        if (!url) return;

        const message = `Use este link único para realizar seu cadastro: ${url}\n\n*Atenção: Este link expira em 48 horas e só pode ser usado uma única vez.*`;
        
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(message);
            } else {
                // Fallback para contextos não seguros (HTTP)
                const textArea = document.createElement("textarea");
                textArea.value = message;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "0";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Falha ao copiar:", err);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger 
                render={
                    <Button onClick={handleGenerate} variant="outline" className="w-full h-10 border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/20 hover:bg-sky-100 dark:hover:bg-sky-900 font-extrabold transition-all shadow-sm">
                        <div className="flex items-center justify-center">
                            <Link2 className="mr-2 h-5 w-5 shrink-0" /> 
                            <span>Convidar<span className="hidden sm:inline ml-1">Usuário</span></span>
                        </div>
                    </Button>
                }
            />
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-sky-600" />
                        Sistema de Convites
                    </DialogTitle>
                    <DialogDescription>
                        Gerencie o acesso de novos colaboradores ao sistema.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex border-b border-slate-100 dark:border-slate-800 mt-4">
                    <button 
                        onClick={() => setActiveTab("new")}
                        className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === "new" ? "text-sky-600 border-b-2 border-sky-600" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900"}`}
                    >
                        Novo Link
                    </button>
                    <button 
                        onClick={() => setActiveTab("history")}
                        className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === "history" ? "text-sky-600 border-b-2 border-sky-600" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900"}`}
                    >
                        Histórico e Gestão
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === "new" ? (
                        <div className="space-y-6">
                            {isPending ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Loader2 className="h-10 w-10 text-sky-500 animate-spin mb-4" />
                                    <p className="text-sm font-medium text-slate-600 animate-pulse">Gerando link único e seguro...</p>
                                </div>
                            ) : inviteUrl ? (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-xl relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-2 opacity-10">
                                            <Check className="h-20 w-20 text-emerald-600" />
                                        </div>
                                        
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Link Pronto para Envio</p>
                                            {copied && <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full animate-bounce">Copiado!</span>}
                                        </div>

                                        <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 text-xs font-mono break-all line-clamp-2 text-slate-700 dark:text-slate-300 mb-4">
                                            {inviteUrl}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <Button 
                                                variant="outline" 
                                                className="w-full text-xs h-10 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                                onClick={() => handleCopy()}
                                            >
                                                {copied ? (
                                                    <><Check className="mr-2 h-4 w-4" /> Copiado!</>
                                                ) : (
                                                    <><Copy className="mr-2 h-4 w-4" /> Copiar Convite</>
                                                )}
                                            </Button>
                                            <Link href={inviteUrl} target="_blank" className="w-full">
                                                <Button variant="outline" className="w-full text-xs h-10 border-slate-200">
                                                    <ExternalLink className="mr-2 h-4 w-4" /> Abrir Link
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                    <Button onClick={handleGenerate} variant="ghost" className="w-full text-xs h-10 text-sky-600 hover:text-sky-700">
                                        Gerar Outro Link
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {isLoadingHistory ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                                </div>
                            ) : invites.length === 0 ? (
                                <p className="text-center py-8 text-sm text-slate-500">Nenhum convite gerado recentemente.</p>
                            ) : (
                                <div className="space-y-2">
                                    {invites.map((inv) => (
                                        <div key={inv.id} className="p-3 border rounded-lg text-sm group hover:border-sky-200 transition-colors">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${inv.used ? "bg-slate-100 text-slate-500" : (new Date() > new Date(inv.expiresAt) ? "bg-red-100 text-red-600" : "bg-sky-100 text-sky-600")}`}>
                                                    {inv.used ? "UTILIZADO" : (new Date() > new Date(inv.expiresAt) ? "EXPIRADO" : "ATIVO")}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    {formatDistanceToNow(new Date(inv.createdAt), { addSuffix: true, locale: ptBR })}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    {inv.used ? (
                                                        <div className="flex items-center gap-1.5 text-slate-600">
                                                            <UserCheck className="h-3 w-3" />
                                                            <span className="truncate">Usado por: <strong>{inv.usedBy?.name || "Usuário"}</strong></span>
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs font-mono text-slate-500 truncate">{inv.token.substring(0, 20)}...</p>
                                                    )}
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {!inv.used && (
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-sky-600" onClick={() => handleCopy(`${window.location.origin}/cadastro/${inv.token}`)}>
                                                            <Copy className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleRevoke(inv.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                    <Button variant="outline" onClick={() => setOpen(false)} className="w-full">
                        Fechar Painel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
